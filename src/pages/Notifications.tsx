import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Bell, Heart, MessageCircle, Users, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ConnectionRequest = Database['public']['Tables']['connection_requests']['Row'];

interface RequestWithProfile extends ConnectionRequest {
  sender: Profile;
}

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [recentMatches, setRecentMatches] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: requestsData } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (requestsData && requestsData.length > 0) {
        const senderIds = requestsData.map(r => r.sender_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', senderIds);

        const requestsWithProfiles = requestsData.map(req => ({
          ...req,
          sender: profiles?.find(p => p.id === req.sender_id)!
        }));

        setRequests(requestsWithProfiles);
      }

      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      const { data: matchesData } = await supabase
        .from('interactions')
        .select('target_user_id, created_at')
        .eq('user_id', user.id)
        .eq('is_match', true)
        .gte('created_at', oneDayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (matchesData && matchesData.length > 0) {
        const matchedIds = matchesData.map(m => m.target_user_id);
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', matchedIds);

        setRecentMatches(matchedProfiles || []);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (requestId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Error handling request:', err);
      alert('Failed to process request. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const totalNotifications = requests.length + recentMatches.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600 mt-1">
              {totalNotifications} notification{totalNotifications !== 1 ? 's' : ''}
            </p>
          </div>
          <Bell className="w-8 h-8 text-gray-400" />
        </div>

        {totalNotifications === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-600">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  Connection Requests
                </h2>
                <div className="space-y-3">
                  {requests.map(request => (
                    <div
                      key={request.id}
                      className="bg-white rounded-lg shadow-md p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-white">
                            {request.sender.full_name?.[0] || request.sender.username[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {request.sender.full_name || request.sender.username}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">@{request.sender.username}</p>
                          {request.message && (
                            <p className="text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg">
                              "{request.message}"
                            </p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRequest(request.id, 'accepted')}
                              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleRequest(request.id, 'declined')}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentMatches.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-500" />
                  Recent Matches
                </h2>
                <div className="space-y-3">
                  {recentMatches.map(match => (
                    <div
                      key={match.id}
                      className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-400 flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {match.full_name?.[0] || match.username[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {match.full_name || match.username}
                          </h3>
                          <p className="text-sm text-gray-600">@{match.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/messages/${match.id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:from-blue-600 hover:to-teal-600 transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Message
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
