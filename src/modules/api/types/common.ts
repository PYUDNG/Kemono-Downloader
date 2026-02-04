export type KemonoService = 'patreon' | 'fanbox' | 'discord' | 'fantia' | 'afdian' | 'boosty' | 'gumroad' | 'subscribestar' | 'dlsite';

/**
 * Post 信息
 */
export interface PostInfo {
    service: KemonoService;
    creatorId: string;
    postId: string;
};
