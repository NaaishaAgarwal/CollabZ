import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Heart, X, Briefcase, Target, Rocket, Sparkles } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

export const Home: React.FC = () => {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [matchModal, setMatchModal] = useState<Profile | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: interactedProfiles } = await supabase
        .from('interactions')
        .select('target_user_id')
        .eq('user_id', user.id);

      const interactedIds = interactedProfiles?.map(i => i.target_user_id) || [];

      const { data: blockedUsers } = await supabase
        .from('blocks')
        .select('blocked_id')
        .eq('blocker_id', user.id);

      const blockedIds = blockedUsers?.map(b => b.blocked_id) || [];

      const { data: blockingUsers } = await supabase
        .from('blocks')
        .select('blocker_id')
        .eq('blocked_id', user.id);

      const blockingIds = blockingUsers?.map(b => b.blocker_id) || [];

      const excludedIds = [...interactedIds, ...blockedIds, ...blockingIds, user.id];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludedIds.join(',')})`)
        .limit(20);

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInteraction = async (interactionType: 'like' | 'reject') => {
    if (!user || currentIndex >= profiles.length) return;

    const targetProfile = profiles[currentIndex];
    setSwipeDirection(interactionType === 'like' ? 'right' : 'left');

    setTimeout(async () => {
      try {
        const { data: interaction, error } = await supabase
          .from('interactions')
          .insert({
            user_id: user.id,
            target_user_id: targetProfile.id,
            interaction_type: interactionType
          })
          .select()
          .single();

        if (error) throw error;

        if (interaction.is_match && interactionType === 'like') {
          setMatchModal(targetProfile);
        }

        setCurrentIndex(prev => prev + 1);
        setSwipeDirection(null);
      } catch (err) {
        console.error('Error recording interaction:', err);
        setSwipeDirection(null);
      }
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Finding collaborators...</p>
        </div>
      </div>
    );
  }

  if (profiles.length === 0 || currentIndex >= profiles.length) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">No More Profiles</h2>
          <p className="text-gray-600 mb-6">
            You've seen all available profiles for now. Check back later for new collaborators!
          </p>
          <button
            onClick={fetchProfiles}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-teal-600 transition-all shadow-lg"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Collaborator</h1>
          <p className="text-gray-600">
            {profiles.length - currentIndex} profile{profiles.length - currentIndex !== 1 ? 's' : ''} remaining
          </p>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 transform ${
            swipeDirection === 'left' ? '-translate-x-full opacity-0' :
            swipeDirection === 'right' ? 'translate-x-full opacity-0' :
            'translate-x-0 opacity-100'
          }`}
        >
          <div className="h-64 bg-gradient-to-br from-blue-400 to-teal-400 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-white shadow-lg flex items-center justify-center">
                <span className="text-5xl font-bold text-gray-700">
                  {currentProfile.full_name?.[0] || currentProfile.username[0].toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">
                {currentProfile.full_name || currentProfile.username}
              </h2>
              <p className="text-gray-600">@{currentProfile.username}</p>
            </div>

            {currentProfile.bio && (
              <p className="text-gray-700 leading-relaxed mb-6">{currentProfile.bio}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {currentProfile.industries.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">Industries</h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentProfile.industries.slice(0, 3).map(industry => (
                      <span key={industry} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {industry}
                      </span>
                    ))}
                    {currentProfile.industries.length > 3 && (
                      <span className="px-2 py-1 text-blue-600 text-xs">
                        +{currentProfile.industries.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {currentProfile.interests.length > 0 && (
                <div className="bg-teal-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-teal-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">Interests</h3>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentProfile.interests.slice(0, 3).map(interest => (
                      <span key={interest} className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">
                        {interest}
                      </span>
                    ))}
                    {currentProfile.interests.length > 3 && (
                      <span className="px-2 py-1 text-teal-600 text-xs">
                        +{currentProfile.interests.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {currentProfile.skills.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.skills.slice(0, 6).map((skill: { name: string; level: string }) => (
                    <span
                      key={skill.name}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm"
                    >
                      {skill.name}
                      <span className="ml-1 text-xs text-gray-500 capitalize">({skill.level})</span>
                    </span>
                  ))}
                  {currentProfile.skills.length > 6 && (
                    <span className="px-3 py-1 text-gray-600 text-sm">
                      +{currentProfile.skills.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {currentProfile.project_idea && (
              <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Rocket className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Project Idea</h3>
                  {currentProfile.project_stage && (
                    <span className="ml-auto px-2 py-1 bg-white rounded-full text-xs font-medium text-gray-700 capitalize">
                      {currentProfile.project_stage.replace('-', ' ')}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{currentProfile.project_idea}</p>
              </div>
            )}

            {currentProfile.looking_for && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Looking For</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{currentProfile.looking_for}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-6 mt-8">
          <button
            onClick={() => handleInteraction('reject')}
            className="w-20 h-20 rounded-full bg-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 border-4 border-red-100"
          >
            <X className="w-10 h-10 text-red-500" />
          </button>
          <button
            onClick={() => handleInteraction('like')}
            className="w-20 h-20 rounded-full bg-white shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-110 border-4 border-green-100"
          >
            <Heart className="w-10 h-10 text-green-500" />
          </button>
        </div>
      </div>

      {matchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-bounce-in">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-white fill-current" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">It's a Match!</h2>
            <p className="text-gray-600 mb-6">
              You and {matchModal.full_name || matchModal.username} both liked each other!
            </p>
            <button
              onClick={() => setMatchModal(null)}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-teal-600 transition-all shadow-lg"
            >
              Continue Matching
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
