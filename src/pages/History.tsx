import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Heart, X, RotateCcw, User } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Interaction {
  id: string;
  profile: Profile;
  type: 'like' | 'reject';
  date: string;
}

export const History: React.FC = () => {
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'like' | 'reject'>('all');

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: interactionsData, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = interactionsData?.map(i => i.target_user_id) || [];

      if (userIds.length === 0) {
        setInteractions([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profileError) throw profileError;

      const interactionsWithProfiles = interactionsData?.map(interaction => ({
        id: interaction.id,
        profile: profiles?.find(p => p.id === interaction.target_user_id)!,
        type: interaction.interaction_type as 'like' | 'reject',
        date: interaction.created_at
      })) || [];

      setInteractions(interactionsWithProfiles);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (interactionId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', interactionId);

      if (error) throw error;

      setInteractions(prev => prev.filter(i => i.id !== interactionId));
    } catch (err) {
      console.error('Error undoing interaction:', err);
      alert('Failed to undo. Please try again.');
    }
  };

  const filteredInteractions = interactions.filter(i =>
    filter === 'all' || i.type === filter
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Interaction History</h1>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({interactions.length})
            </button>
            <button
              onClick={() => setFilter('like')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                filter === 'like'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Heart className="w-4 h-4" />
              Likes ({interactions.filter(i => i.type === 'like').length})
            </button>
            <button
              onClick={() => setFilter('reject')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                filter === 'reject'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <X className="w-4 h-4" />
              Passes ({interactions.filter(i => i.type === 'reject').length})
            </button>
          </div>
        </div>

        {filteredInteractions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No interactions yet</h3>
            <p className="text-gray-600">
              Your interaction history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInteractions.map(interaction => (
              <div
                key={interaction.id}
                className="bg-white rounded-lg shadow-md p-6 flex items-center gap-4 hover:shadow-lg transition-shadow"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center flex-shrink-0">
                  {interaction.profile.avatar_url ? (
                    <img
                      src={interaction.profile.avatar_url}
                      alt={interaction.profile.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white">
                      {interaction.profile.full_name?.[0] || interaction.profile.username[0].toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {interaction.profile.full_name || interaction.profile.username}
                  </h3>
                  <p className="text-gray-600 text-sm">@{interaction.profile.username}</p>
                  {interaction.profile.bio && (
                    <p className="text-gray-700 text-sm mt-1 line-clamp-1">{interaction.profile.bio}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center">
                    {interaction.type === 'like' ? (
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-1">
                        <Heart className="w-6 h-6 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-1">
                        <X className="w-6 h-6 text-red-600" />
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(interaction.date).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleUndo(interaction.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Undo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
