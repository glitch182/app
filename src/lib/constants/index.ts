import type { ProfileTabType } from '#/types/common'
import type { Address } from 'viem'

export const APP_NAME = 'Ethereum Follow Protocol'
export const APP_NAME_SHORT = 'EFP'
export const APP_DESCRIPTION =
  'A native Ethereum protocol for following and tagging Ethereum accounts.'
export const APP_URL =
  process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4321'

export const ENS_SUBGRAPH = 'https://api.thegraph.com/subgraphs/name/ensdomains/ens'

export const teamAddresses: Address[] = [
  '0x983110309620D911731Ac0932219af06091b6744',
  '0xC983Ebc9dB969782D994627bdfFeC0ae6efee1b3'
]

export const SECOND = 1_000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY

export const PROFILE_TABS: ProfileTabType[] = ['following', 'followers']
export const LANGUAGES = [
  { language: 'English', key: 'en' },
  { language: 'Slovenščina', key: 'si' }
]
export const DEFAULT_TAGS = ['No Tag', 'Blocked', 'Muted']
export const SORT_OPTIONS = ['follower count', 'latest first', 'earliest first', 'alphabetical']

export const NAV_ITEMS = [
  {
    href: '/',
    emoji: '🏠',
    name: 'home',
    private: false
  },
  {
    href: '/profile',
    emoji: '👤',
    name: 'profile',
    private: true
  },
  {
    href: '/leaderboard?filter=followers',
    emoji: '🏆',
    name: 'leaderboard',
    private: false
  }
]
