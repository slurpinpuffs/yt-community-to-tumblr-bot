# yt-community-to-tumblr-bot
Bot that gets YouTube community posts and YouTube video posts from a given channel and posts them to Tumblr.

To use, download files, change the variables in .env, then run index.js.

Checks for updates every 10 seconds after start. To change this, change the MS_BETWEEN_CHECKS variable in .env.

Current limitations:
- Long links will sometimes be broken with an elipses due to links being shortened by YouTube
- Images in posts with multiple images will be square, so some parts may be cropped out
