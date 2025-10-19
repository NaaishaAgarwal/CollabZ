import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/supabase';
import { Search as SearchIcon, Filter, Heart, X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Profile = Database['public']['Tables']['profiles']['Row'];

const INDUSTRIES = [
  'Technology', 'Healthcare', 'Education', 'Finance', 'Marketing',
  'Design', 'Engineering', 'Science', 'Arts', 'Social Impact'
];

const COMMITMENT_LEVELS = ['casual', 'part-time', 'full-time'];
const PROJECT_STAGES = ['idea', 'planning', 'active', 'recruiting'];

export const Search: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    industries: [] as string[],
    commitmentLevel: '',
    projectStage: ''
  });

  useEffect(() => {
    fetchProfiles();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, profiles]);

  const fetchProfiles = async () => {
    if (!user) return;

    setLoading(true);
    try {
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

      const excludedIds = [...blockedIds, ...blockingIds, user.id];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('id', 'in', `(${excludedIds.join(',')})`)
        .limit(100);

      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...profiles];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(profile =>
        profile.username.toLowerCase().includes(query) ||
        profile.full_name?.toLowerCase().includes(query) ||
        profile.bio?.toLowerCase().includes(query) ||
        profile.project_idea?.toLowerCase().includes(query)
      );
    }

    if (filters.industries.length > 0) {
      filtered = filtered.filter(profile =>
        profile.industries.some(industry => filters.industries.includes(industry))
      );
    }

    if (filters.commitmentLevel) {
      filtered = filtered.filter(profile =>
        profile.commitment_level === filters.commitmentLevel
      );
    }

    if (filters.projectStage) {
      filtered = filtered.filter(profile =>
        profile.project_stage === filters.projectStage
      );
    }

    setFilteredProfiles(filtered);
  };

  const toggleIndustry = (industry: string) => {
    setFilters(prev => ({
      ...prev,
      industries: prev.industries.includes(industry)
        ? prev.industries.filter(i => i !== industry)
        : [...prev.industries, industry]
    }));
  };

  const handleInteraction = async (profileId: string, interactionType: 'like' | 'reject') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('interactions')
        .insert({
          user_id: user.id,
          target_user_id: profileId,
          interaction_type: interactionType
        });

      if (error) throw error;

      setFilteredProfiles(prev => prev.filter(p => p.id !== profileId));
    } catch (err) {
      console.error('Error recording interaction:', err);
    }
  };

  const clearFilters = () => {
    setFilters({
      industries: [],
      commitmentLevel: '',
      projectStage: ''
    });
    setSearchQuery('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Search Collaborators</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search by name, username, project idea..."
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="pt-4 border-t border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industries
                </label>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map(industry => (
                    <button
                      key={industry}
                      onClick={() => toggleIndustry(industry)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        filters.industries.includes(industry)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commitment Level
                  </label>
                  <select
                    value={filters.commitmentLevel}
                    onChange={(e) => setFilters({ ...filters, commitmentLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All levels</option>
                    {COMMITMENT_LEVELS.map(level => (
                      <option key={level} value={level} className="capitalize">
                        {level.replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Stage
                  </label>
                  <select
                    value={filters.projectStage}
                    onChange={(e) => setFilters({ ...filters, projectStage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All stages</option>
                    {PROJECT_STAGES.map(stage => (
                      <option key={stage} value={stage} className="capitalize">
                        {stage.replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className="text-gray-600">
            {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <SearchIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No profiles found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map(profile => (
              <div key={profile.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-32 bg-gradient-to-br from-blue-400 to-teal-400 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-3xl font-bold text-gray-700">
                          {profile.full_name?.[0] || profile.username[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {profile.full_name || profile.username}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">@{profile.username}</p>

                  {profile.bio && (
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{profile.bio}</p>
                  )}

                  {profile.industries.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {profile.industries.slice(0, 2).map(industry => (
                          <span key={industry} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {industry}
                          </span>
                        ))}
                        {profile.industries.length > 2 && (
                          <span className="px-2 py-1 text-blue-600 text-xs">
                            +{profile.industries.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {profile.project_stage && (
                    <div className="mb-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium capitalize">
                        {profile.project_stage.replace('-', ' ')}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleInteraction(profile.id, 'reject')}
                      className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Pass
                    </button>
                    <button
                      onClick={() => handleInteraction(profile.id, 'like')}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:from-blue-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Heart className="w-4 h-4" />
                      Like
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
