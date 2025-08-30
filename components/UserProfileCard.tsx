import React from 'react';

/**
 * @interface User
 * @description Defines the structure of a user object for the UserProfileCard.
 * Includes necessary details like avatar URL, full name, handle, and an optional bio.
 */
interface User {
  avatarUrl: string;
  fullName: string;
  handle: string;
  bio?: string; // Optional short biography
}

/**
 * @interface UserProfileCardProps
 * @description Defines the props for the UserProfileCard component.
 * It requires a User object and a URL for the user's profile page.
 */
interface UserProfileCardProps {
  user: User;
  profileUrl: string;
}

/**
 * @function UserProfileCard
 * @description A React functional component that displays a user's profile information
 * in a visually appealing card format. It includes the user's avatar, name, handle,
 * and an optional short bio. The entire card acts as a clickable link to the user's profile page.
 *
 * @param {UserProfileCardProps} props - The properties for the component.
 * @param {User} props.user - The user object containing profile details.
 * @param {string} props.profileUrl - The URL to which the card should link (user's profile page).
 *
 * @returns {JSX.Element} A React component rendering the user profile card.
 */
const UserProfileCard: React.FC<UserProfileCardProps> = ({ user, profileUrl }) => {
  return (
    <a
      href={profileUrl}
      className="block p-4 bg-bg-dark rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 ease-in-out
                 border border-gray-700/50 hover:border-brand-primary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-75
                 transform hover:-translate-y-1"
      aria-label={`View profile of ${user.fullName}`}
      role="link"
      onClick={(e) => e.preventDefault()} // Prevent navigation for placeholder URL
    >
      <div className="flex items-center gap-4">
        {/* User Avatar */}
        <img
          src={user.avatarUrl}
          alt={`${user.fullName}'s avatar`}
          className="w-16 h-16 rounded-full object-cover flex-shrink-0
                     border-2 border-brand-primary p-[2px]"
          // Fallback for broken images or accessibility, though specific icon not requested.
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/64?text=User'; // A simple fallback placeholder
            e.currentTarget.alt = 'User avatar (placeholder)';
          }}
        />

        {/* User Details */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-brand-secondary leading-tight truncate">
            {user.fullName}
          </h2>
          <p className="text-sm text-brand-primary hover:text-brand-dark transition-colors leading-tight mt-0.5 truncate">
            @{user.handle}
          </p>

          {/* User Bio (conditionally rendered) */}
          {user.bio && (
            <p className="mt-2 text-sm text-base-300 leading-snug line-clamp-2">
              {user.bio}
            </p>
          )}
        </div>
      </div>
    </a>
  );
};

export default UserProfileCard;
