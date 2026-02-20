import { PostApiResponse } from './post.js';
import { PostsApiResponse } from './posts.js';
import { ProfileApiResponse } from './profile.js';

export * from './common.js';
export * from './post.js';
export * from './posts.js';
export * from './profile.js';

export type KemonoApiResponse = PostApiResponse | PostsApiResponse | ProfileApiResponse;

