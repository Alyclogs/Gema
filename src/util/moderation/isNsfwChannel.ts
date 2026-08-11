type ChannelWithNsfw = {
  nsfw?: boolean;
  parent?: unknown;
};

export function isNsfwChannel(channel: unknown): boolean {
  if (!channel || typeof channel !== 'object') return false;

  const currentChannel = channel as ChannelWithNsfw;
  if (currentChannel.nsfw === true) return true;

  const parentChannel = currentChannel.parent;
  return !!(
    parentChannel &&
    typeof parentChannel === 'object' &&
    (parentChannel as ChannelWithNsfw).nsfw === true
  );
}
