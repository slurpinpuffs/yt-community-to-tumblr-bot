const tumblr = require('tumblr.js');
const fs = require('fs');
const https = require('https');
const { Innertube } = require('youtubei.js');
// Authenticate Tumblr acc via OAuth
const client = tumblr.createClient({
  consumer_key: '',
  consumer_secret: '',
  token: '',
  token_secret: ''
});
const blogToPost = 'example-blog';
const tumblrTags = ["tags", "like", "this"];

let lastUpdateLocation = __dirname + '/last_update.txt';

// Example ID: Marisa Honkai's channel ID
let youtubeChannelId = 'UC0S7OwBRuCYyeZrM6dq9Ykg';

async function getBlogInfo(blogName){
  // Make the request
  var response = await client.blogInfo(blogName);
  return response;
}

async function createTextPost(blogName, text){
  await client.createPost(blogName, {
      content: [
        {
          type: 'text',
          text: text,
        },
      ],
      tags: tumblrTags
    }
  );
}

async function createTextPostWithImages(blogName, text, mediaUrlArray){
  // To-do: make post multiple images
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

  await client.createPost(blogName, {
      content: content,
      tags: tumblrTags
    }
  );
}

function postToTumblr(post){

  // Posts to Tumblr without image
  createTextPost(blogToPost, post);

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

function postToTumblrWithImages(post, imageUrlArray){
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
      setTimeout(waitForDownload, 100)
    }else{
      createTextPostWithImages(blogToPost, post, images);

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

function getRecentCommPicUrl(community){
  if(community.current_tab.content.contents[0].contents[0].post.attachment.type == 'PostMultiImage'){
    var images = community.current_tab.content.contents[0].contents[0].post.attachment.images;
    var imageUrls = [];
    images.forEach((image) => imageUrls.push(image.image[0].url));

    return imageUrls;
  }else if(community.current_tab.content.contents[0].contents[0].post.attachment.type == 'BackstageImage'){
    return [community.current_tab.content.contents[0].contents[0].post.attachment.image[0].url];
  }
}

function getCommText(community, postIndex){
  return community.current_tab.content.contents[0].contents[postIndex].post.content.text;
}

function getCommPicUrl(community, postIndex){
  if(community.current_tab.content.contents[0].contents[postIndex].post.attachment.type == 'PostMultiImage'){
    var images = community.current_tab.content.contents[0].contents[postIndex].post.attachment.images;
    var imageUrls = [];
    images.forEach((image) => imageUrls.push(image.image[0].url));

    return imageUrls;
  }else if(community.current_tab.content.contents[0].contents[postIndex].post.attachment.type == 'BackstageImage'){
    return [community.current_tab.content.contents[0].contents[postIndex].post.attachment.image[0].url];
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

    fs.readFile(lastUpdateLocation, (err, data) => {
      if(err) throw err;
      if(data == latestPost.toString()){
        console.log(`${new Date().toString()}:`);
        console.log("Community post already posted on Tumblr!");
      }else{
        if(isRecentPostImage(community)){
          var imageUrlArray = getRecentCommPicUrl(community);
          postToTumblrWithImages(latestPost, imageUrlArray);
        }else{
          postToTumblr(latestPost);
        }
      }
    });
  }catch (error){
    console.error(error.message);
  };
};

async function testPrint(channel){
  var community = await channel.getCommunity();

  console.log(community.current_tab.content);
}

(async () => {
  const youtube = await Innertube.create(); 
  const channel = await youtube.getChannel(youtubeChannelId); 
  var community = await channel.getCommunity();

  checkForCommPost(channel);
  // Checks for updates every 10 seconds after launch
  setInterval(checkForCommPost, 10000, channel);
})();