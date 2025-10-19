import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Heart, MessageCircle, User, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Match {
  id: string;
  profile: Profile;
  matchedAt: string;
}

export const Matches: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, [user]);

  /*const fetchMatches = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: interactions, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_match', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const matchedUserIds = interactions?.map(i => i.target_user_id) || [];

      if (matchedUserIds.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', matchedUserIds);

      if (profileError) throw profileError;

      const matchesWithProfiles = interactions?.map(interaction => ({
        id: interaction.id,
        profile: profiles?.find(p => p.id === interaction.target_user_id)!,
        matchedAt: interaction.created_at
      })) || [];

      setMatches(matchesWithProfiles);
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }*/

    const fetchMatches = async () => {
      if (!user) return;
    
      setLoading(true);
      try {
        // 1️⃣ Get all interactions where the current user is EITHER the liker OR the liked
        // and the match has been confirmed (is_match = true)
        const { data: interactions, error } = await supabase
          .from('interactions')
          .select('*')
          .or(
            `and(user_id.eq.${user.id}, is_match.eq.true),and(target_user_id.eq.${user.id}, is_match.eq.true)`
          )
          .order('created_at', { ascending: false });
    
        if (error) throw error;
    
        if (!interactions || interactions.length === 0) {
          setMatches([]);
          setLoading(false);
          return;
        }
    
        // 2️⃣ Figure out who the *other person* is in each match
        // (if user was the liker, target_user_id is the other person; otherwise it's user_id)
        const matchedUserIds = interactions.map(i =>
          i.user_id === user.id ? i.target_user_id : i.user_id
        );
    
        // 3️⃣ Fetch those users' profiles
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', matchedUserIds);
    
        if (profileError) throw profileError;
    
        // 4️⃣ Combine interactions + profiles into match objects
        const matchesWithProfiles =
          interactions.map(interaction => {
            const otherUserId =
              interaction.user_id === user.id
                ? interaction.target_user_id
                : interaction.user_id;
            const profile = profiles?.find(p => p.id === otherUserId);
            return {
              id: interaction.id,
              profile: profile!,
              matchedAt: interaction.created_at,
            };
          }) || [];
    
        setMatches(matchesWithProfiles);
      } catch (err) {
        console.error('Error fetching matches:', err);
      } finally {
        setLoading(false);
      }
    };
    

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Matches</h1>
        <p className="text-gray-600 mb-8">
          {matches.length} match{matches.length !== 1 ? 'es' : ''}
        </p>

        {matches.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches yet</h3>
            <p className="text-gray-600 mb-6">
              Start swiping to find your perfect collaborators!
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg"
            >
              Start Matching
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map(match => (
              <div key={match.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-32 bg-gradient-to-br from-green-400 to-teal-400 relative">
                  <div className="absolute top-2 right-2">
                    <div className="bg-white rounded-full p-2 shadow-md">
                      <Heart className="w-4 h-4 text-green-500 fill-current" />
                    </div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                      {match.profile.avatar_url ? (
                        <img src={match.profile.avatar_url} alt={match.profile.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-gray-700">
                          {match.profile.full_name?.[0] || match.profile.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {match.profile.full_name || match.profile.username}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">@{match.profile.username}</p>

                  {match.profile.bio && (
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{match.profile.bio}</p>
                  )}

                  {match.profile.industries.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {match.profile.industries.slice(0, 3).map(industry => (
                          <span key={industry} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {industry}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => navigate(`/messages/${match.profile.id}`)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:from-blue-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2 font-medium"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Send Message
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 mt-3 text-center">
                    Matched {new Date(match.matchedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
