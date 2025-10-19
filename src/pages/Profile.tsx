import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase, Target, Rocket, Edit2, LogOut } from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-500 to-teal-500"></div>

          <div className="relative px-8 pb-8">
            <div className="flex items-end justify-between -mt-16 mb-6">
              <div className="flex items-end gap-4">
                <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <div className="mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.full_name || profile.username}
                  </h1>
                  <p className="text-gray-600">@{profile.username}</p>
                </div>
              </div>

              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => navigate('/profile/edit')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>

            {profile.bio && (
              <div className="mb-8">
                <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.industries.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">Industries</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.industries.map(industry => (
                      <span key={industry} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.interests.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-teal-500" />
                    <h3 className="font-semibold text-gray-900">Interests</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map(interest => (
                      <span key={interest} className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.skills.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-gray-900">Skills</h3>
                  </div>
                  <div className="space-y-2">
                    {profile.skills.map((skill: { name: string; level: string }) => (
                      <div key={skill.name} className="flex items-center justify-between">
                        <span className="text-gray-700">{skill.name}</span>
                        <span className="px-2 py-1 bg-white rounded text-xs font-medium text-gray-600 capitalize">
                          {skill.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.commitment_level && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Rocket className="w-5 h-5 text-teal-500" />
                    <h3 className="font-semibold text-gray-900">Commitment Level</h3>
                  </div>
                  <p className="text-gray-700 capitalize">{profile.commitment_level.replace('-', ' ')}</p>
                </div>
              )}
            </div>

            {profile.project_stage && profile.project_idea && (
              <div className="mt-6 bg-gradient-to-br from-blue-50 to-teal-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Rocket className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">Current Project</h3>
                  <span className="ml-auto px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700 capitalize">
                    {profile.project_stage.replace('-', ' ')}
                  </span>
                </div>
                <p className="text-gray-700 leading-relaxed">{profile.project_idea}</p>
              </div>
            )}

            {profile.looking_for && (
              <div className="mt-6 bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Looking For</h3>
                <p className="text-gray-700 leading-relaxed">{profile.looking_for}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
