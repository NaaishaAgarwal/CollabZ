import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { MessageCircle, Send, User, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];

interface Conversation {
  profile: Profile;
  lastMessage?: Message;
  unreadCount: number;
}

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (userId) {
      loadConversation(userId);
    }
  }, [userId]);

  /*useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user?.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id === selectedConversation.id) {
            setMessages(prev => [...prev, newMsg]);
            markAsRead(newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);*/

  useEffect(() => {
    if (!selectedConversation || !user) return;
  
    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${user.id},receiver_id.eq.${selectedConversation.id}),and(sender_id.eq.${selectedConversation.id},receiver_id.eq.${user.id}))`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
  
          // ✅ Only append if the new message belongs to this conversation
          if (
            (newMsg.sender_id === user.id &&
              newMsg.receiver_id === selectedConversation.id) ||
            (newMsg.sender_id === selectedConversation.id &&
              newMsg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMsg]);
  
            // ✅ If receiver is current user, mark as read
            if (newMsg.receiver_id === user.id) {
              markAsRead(newMsg.id);
            }
          }
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);
  

  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: matches } = await supabase
        .from('interactions')
        .select('target_user_id')
        .eq('user_id', user.id)
        .eq('is_match', true);

      const matchedUserIds = matches?.map(m => m.target_user_id) || [];

      if (matchedUserIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', matchedUserIds);

      const conversationsData: Conversation[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', profile.id)
            .eq('receiver_id', user.id)
            .eq('read', false);

          return {
            profile,
            lastMessage: lastMsg || undefined,
            unreadCount: count || 0
          };
        })
      );

      conversationsData.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || '';
        const bTime = b.lastMessage?.created_at || '';
        return bTime.localeCompare(aTime);
      });

      setConversations(conversationsData);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (profileId: string) => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (!profile) return;

      setSelectedConversation(profile);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      setMessages(msgs || []);

      const unreadMsgs = msgs?.filter(m => m.sender_id === profileId && !m.read) || [];
      for (const msg of unreadMsgs) {
        await markAsRead(msg.id);
      }

      await fetchConversations();
    } catch (err) {
      console.error('Error loading conversation:', err);
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('id', messageId);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConversation || !newMessage.trim()) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedConversation.id,
          content: newMessage.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, data]);
      setNewMessage('');
      await fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex">
      <div className={`${selectedConversation ? 'hidden md:block' : 'block'} w-full md:w-96 bg-white border-r border-gray-200 flex flex-col`}>
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-600 mt-1">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">No conversations yet</p>
              <p className="text-sm text-gray-500 mt-1">Match with someone to start chatting!</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.profile.id}
                onClick={() => {
                  navigate(`/messages/${conv.profile.id}`);
                  loadConversation(conv.profile.id);
                }}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                  selectedConversation?.id === conv.profile.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-white">
                    {conv.profile.full_name?.[0] || conv.profile.username[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {conv.profile.full_name || conv.profile.username}
                    </h3>
                    {conv.unreadCount > 0 && (
                      <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-sm text-gray-600 truncate">
                      {conv.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                      {conv.lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`${selectedConversation ? 'block' : 'hidden md:block'} flex-1 flex flex-col`}>
        {selectedConversation ? (
          <>
            <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedConversation(null);
                  navigate('/messages');
                }}
                className="md:hidden"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center">
                <span className="text-lg font-bold text-white">
                  {selectedConversation.full_name?.[0] || selectedConversation.username[0].toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">
                  {selectedConversation.full_name || selectedConversation.username}
                </h2>
                <p className="text-sm text-gray-600">@{selectedConversation.username}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      msg.sender_id === user?.id
                        ? 'bg-gradient-to-r from-blue-500 to-teal-500 text-white'
                        : 'bg-white text-gray-900 shadow-sm'
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Type a message..."
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:from-blue-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
