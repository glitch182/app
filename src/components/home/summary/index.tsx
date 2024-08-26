'use client'

import { useAccount } from 'wagmi'
import { useTranslation } from 'react-i18next'

import Recommendations from '#/components/recommendations'
import LatestFollowers from './components/latest-followers'
import UserProfileCard from '#/components/user-profile-card'
import { useEFPProfile } from '#/contexts/efp-profile-context'
import ScrollIndicator from '#/components/scroll-indicator.tsx'
import LeaderboardSummary from './components/leaderboard-summary.tsx'

const Summary = () => {
  const { t } = useTranslation()
  const { address: userAddress } = useAccount()
  const { profile, followers, selectedList, profileIsLoading, followersIsLoading } = useEFPProfile()

  const isFollowersEmpty = !followersIsLoading && followers.length === 0

  return (
    <div className='mt-[108px] relative md:mt-32 w-full lg:mt-32 xl:mt-40 px-4 lg:px-6 xl:pl-4 xl:pr-0 2xl:px-8 flex items-start lg:justify-center lg:gap-4 xl:justify-center justify-center flex-wrap xl:flex-nowrap gap-y-4'>
      {userAddress && (
        <UserProfileCard
          profileList={selectedList || Number(profile?.primary_list)}
          hideFollowButton={true}
          profile={profile}
          isLoading={profileIsLoading}
          borderColor='border-[#FFDBD9]'
        />
      )}
      {!isFollowersEmpty && userAddress ? (
        <LatestFollowers
          isLoading={followersIsLoading}
          profiles={followers?.slice(0, 7).map(follower => ({
            tags: follower.tags,
            address: follower.address,
            ens: follower.ens
          }))}
        />
      ) : (
        <LeaderboardSummary />
      )}
      <Recommendations
        limit={7}
        endpoint='discover'
        header={t('discover')}
        className={`h-fit w-full ${
          isFollowersEmpty || !userAddress
            ? 'xl:w-[49%] xl:max-w-[900px]'
            : 'lg:h-[638px] lg:w-[47.5%] xl:w-[38%] w-[470px] 2xl:min-w-[650px] 2xl:w-[45%]'
        } py-4 sm:p-4 glass-card border-[3px] border-gray-200 rounded-2xl`}
      />
      <ScrollIndicator />
    </div>
  )
}

export default Summary
