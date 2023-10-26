# yt-community-to-tumblr-bot
Bot that gets YouTube community posts from a given channel and posts to Tumblr.

To use, download files, change the 4 variables in index.js that are marked "CHANGE THIS:", then run index.js.
Checks for updates every 10 seconds after start. To change this, change the millisecondsToWait variable in index.js.

Current limitations:
- Long links will sometimes be broken with an elipses due to links being shortened by YouTube
- All pictures are square, so some parts may get cut off
