const tumblr = require('tumblr.js');
const fs = require('fs');
const https = require('https');
const { Innertube } = require('youtubei.js');
// CHANGE THIS: Authenticate Tumblr acc via OAuth
const client = tumblr.createClient({
  consumer_key: '',
  consumer_secret: '',
  token: '',
  token_secret: ''
});
// CHANGE THIS: The name of the blog you own that you want to post to
const blogToPost = 'example-blog-name';
// CHANGE THIS: These tags will be posted with every post
const tumblrTags = ["tags", "like", "this"];

// CHANGE THIS: Example ID is Marisa Honkai's channel ID
let youtubeChannelId = 'UC0S7OwBRuCYyeZrM6dq9Ykg';

let lastUpdateLocation = __dirname + '/last_update.txt';
let millisecondsToWait = 10000;

async function createTextPost(blogName, text, sourceUrl){
  await client.createPost(blogName, {
      content: [
        {
          type: 'text',
          text: text,
        },
        {
          type: 'text',
          text: 'Original Post',
          formatting: [
            {
              start: 0,
              end: 13,
              type: 'link',
              url: sourceUrl
            }
          ]
        }
      ],
      tags: tumblrTags
    }
  );
}

async function createTextPostWithImages(blogName, text, mediaUrlArray, sourceUrl){
  let index = 0;
  let content = [{
    type: 'text',
    text: text,
  }];

  mediaUrlArray.forEach(() => {
    content.push({
      type: 'image',
      media: fs.createReadStream(mediaUrlArray[index]),
    });
    index++;
  });

  content.push({
    type: 'text',
    text: 'Original Post',
    formatting: [
      {
        start: 0,
        end: 13,
        type: 'link',
        url: sourceUrl
      }
    ]
  });

  await client.createPost(blogName, {
      content: content,
      tags: tumblrTags
    }
  );
}

function postToTumblr(post, source){

  // Posts to Tumblr without image
  createTextPost(blogToPost, post, source);

  // Logs post to console
  console.log(`${new Date().toString()}:`);
  console.log(`Posted:\n${post}`);

  // Saves copy of post to file
  fs.writeFile(lastUpdateLocation, post, function(err) {
    if(err){
      return console.log(err);
    }
    console.log("Last post updated!");
  });
}

function postToTumblrWithImages(post, imageUrlArray, source){
  // Posts to Tumblr without image
  let images = [];
  let baseImageLocation = __dirname + '\\image';
  let imageCount = 0;
  let index = 0;

  imageUrlArray.forEach((imageUrl) => {
    var currImageLocation = baseImageLocation + index.toString() + '.jpg';
    var file = fs.createWriteStream(currImageLocation);

    https.get(imageUrl, response => {
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Image downloaded as ${currImageLocation}`);
        imageCount++;
      });
    }).on('error', err => {
      fs.unlink(currImageLocation);
      console.error(`Error downloading image: ${currImageLocation}`);
    });
    images.push(currImageLocation);

    index++;
  });

  function waitForDownload(){
    if(imageCount != imageUrlArray.length){
      setTimeout(waitForDownload, 100);
    }else{
      createTextPostWithImages(blogToPost, post, images, source);

      // Logs post to console
      console.log(`${new Date().toString()}:`);
      console.log(`Posted with image(s):\n${post}`);

      // Saves copy of post to file
      fs.writeFile(lastUpdateLocation, post, function(err) {
        if(err){
          return console.log(err);
        }
        console.log("Last post updated!");
      });
    }
  }

  waitForDownload();
}

function getRecentCommText(community){
  return community.current_tab.content.contents[0].contents[0].post.content.text;
}

function getRecentCommPostUrl(community){
  var postId = community.current_tab.content.contents[0].contents[0].post.id;
  var postUrl = 'https://www.youtube.com/channel/' + youtubeChannelId + '/community?lb=' + postId;
  return postUrl;
}

function getRecentCommPicUrl(community, cb){
  var imageUrls = [];

  if(community.current_tab.content.contents[0].contents[0].post.attachment.type == 'PostMultiImage'){
    var images = community.current_tab.content.contents[0].contents[0].post.attachment.images;
    images.forEach((image) => imageUrls.push(image.image[0].url));

    cb(null, imageUrls);
  }else if(community.current_tab.content.contents[0].contents[0].post.attachment.type == 'BackstageImage'){
    //return [community.current_tab.content.contents[0].contents[0].post.attachment.image[0].url];

    // If post has just one pic, grabs full pic from post URL
    var htmlLocation = "C:\\Users\\Shakw\\Desktop\\NodeProjects\\hi3-updates-bot\\yt-community-to-tumblr-bot\\post.html";
    var link = " ";
    var file = fs.createWriteStream(htmlLocation);

    https.get(getRecentCommPostUrl(community), response => {
        response.pipe(file);

        file.on('finish', () => {
          file.close();
          console.log(`File downloaded as ${htmlLocation}`);
          fs.readFile(htmlLocation, (err, data) => {
            if(err) throw err;
            if(data.includes('https://yt3.ggpht.com')){
              console.log("Found it!");
              link = data.toString();
              link = link.substring(link.lastIndexOf("https://yt3.ggpht.com"));
              link = link.substring(0, link.indexOf('"'));
              imageUrls.push(link);
              cb(null, imageUrls);
            }else{
              console.log("Can't find image link in html.");
              imageUrls.push(community.current_tab.content.contents[0].contents[0].post.attachment.image[0].url);
              cb(null, imageUrls);
            }
          });
        });
    }).on('error', () => {
        fs.unlink(htmlLocation);
        console.error(`Error downloading html: ${htmlLocation}. Returning thumbnail.`);
        imageUrls.push(community.current_tab.content.contents[0].contents[0].post.attachment.image[0].url);
        cb(null, imageUrls);
    });
  }
}

function isRecentPostImage(community){
  if(community.current_tab.content.contents[0].contents[0].post.attachment.type == 'PostMultiImage'){
    return true;
  }else if(community.current_tab.content.contents[0].contents[0].post.attachment.type == 'BackstageImage'){
    return true;
  }else{
    return false;
  }
}

async function checkForCommPost(channel){

  var community = await channel.getCommunity();

  try{
    var latestPost = getRecentCommText(community);
    var source = getRecentCommPostUrl(community);

    fs.readFile(lastUpdateLocation, (err, data) => {
      if(err) throw err;
      if(data == latestPost.toString()){
        console.log(`${new Date().toString()}:`);
        console.log("Community post already posted on Tumblr!");
      }else{
        if(isRecentPostImage(community)){
          var imageUrlArray;

          getRecentCommPicUrl(community, (err, value) => {
            if(err) return console.error(err);
            imageUrlArray = value;
            postToTumblrWithImages(latestPost, imageUrlArray, source);
          });
        }else{
          postToTumblr(latestPost, source);
        }
      }
    });
  }catch (error){
    console.error(error.message);
  };
};

(async () => {
  const youtube = await Innertube.create(); 
  const channel = await youtube.getChannel(youtubeChannelId); 

  checkForCommPost(channel);
  // Checks for updates every 10 seconds after launch
  setInterval(checkForCommPost, millisecondsToWait, channel);
})();