import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Shield, UserX, Unlock } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface BlockedUser {
  id: string;
  profile: Profile;
  blockedAt: string;
}

export const BlockedUsers: React.FC = () => {
  const { user } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlockedUsers();
  }, [user]);

  const fetchBlockedUsers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: blocks } = await supabase
        .from('blocks')
        .select('*')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (blocks && blocks.length > 0) {
        const blockedIds = blocks.map(b => b.blocked_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', blockedIds);

        const blockedUsersData = blocks.map(block => ({
          id: block.id,
          profile: profiles?.find(p => p.id === block.blocked_id)!,
          blockedAt: block.created_at
        }));

        setBlockedUsers(blockedUsersData);
      }
    } catch (err) {
      console.error('Error fetching blocked users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      setBlockedUsers(prev => prev.filter(b => b.id !== blockId));
    } catch (err) {
      console.error('Error unblocking user:', err);
      alert('Failed to unblock user. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">Blocked Users</h1>
          </div>
          <p className="text-gray-600">
            {blockedUsers.length} blocked user{blockedUsers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {blockedUsers.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No blocked users</h3>
            <p className="text-gray-600">
              You haven't blocked anyone yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map(blocked => (
              <div
                key={blocked.id}
                className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                    <UserX className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {blocked.profile.full_name || blocked.profile.username}
                    </h3>
                    <p className="text-sm text-gray-600">@{blocked.profile.username}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Blocked on {new Date(blocked.blockedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleUnblock(blocked.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Unlock className="w-4 h-4" />
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2">About Blocking</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Blocked users cannot see your profile or send you messages</li>
            <li>• You won't see their profile in recommendations or search results</li>
            <li>• Existing matches and messages will be hidden</li>
            <li>• You can unblock users at any time</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
