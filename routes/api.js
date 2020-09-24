/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

"use strict";

var expect = require("chai").expect;
var mongoose = require("mongoose");
var fetch = require("node-fetch");

// option to use FindOneAndUpdate
mongoose.set("useFindAndModify", false);
// database setup
const CONNECTION_STRING = process.env.DB;

// Schema
var Schema = mongoose.Schema;
// only two things we want to track, since price changes everyday
var stockSchema = new Schema({
  stock: { type: String, required: true },
  likes: { type: Number, required: false }
});
// Models
var StockModel = mongoose.model("stock", stockSchema);
// API Provided to get stock data
// https://repeated-alpaca.glitch.me/v1/stock/[symbol]/quote

async function oneStock(symbol, like) {
  let resultObj = {};
  //url to fetch the data
  let url = `https://repeated-alpaca.glitch.me/v1/stock/${symbol}/quote`;
  // getting the stock data using the API
  let response = await fetch(url);
  var data;
  if (response.ok) {
    data = await response.json();
  } else {
    alert(`HTTP Error: ${response.status}`);
  }
  //model to query the db with
  let existCheck = await StockModel.findOne(
    { stock: data.symbol },
    (err, result) => {
      if (err == null) {
        //we want the data no matter what, even if its null, b/c it tells us there was no match
        return result;
      } else {
        console.warn(err);
      }
    }
  );
  if (existCheck == null) {
    //if the stock didn't already exist
    if (like) {
      //if it was liked, we initialize with 1 like
      let newModel = new StockModel({ stock: symbol, likes: 1 });
      newModel.save(function(err) {
        if (err) return console.warn(err);
      });
      resultObj.stockData = {
        stock: data.symbol,
        price: data.latestPrice.toString(),
        likes: 1
      };
    } else {
      //if it wasn't liked, we initialize with 0 likes
      let newModel = new StockModel({ stock: symbol, likes: 0 });
      newModel.save(function(err) {
        if (err) return console.warn(err);
      });
      resultObj.stockData = {
        stock: data.symbol,
        price: data.latestPrice.toString(),
        likes: 0
      };
    }
  } else {
    //if the stock already existed
    if (like && existCheck.likes == 0) {
      //if the like button was pressed, increment the likes by one in the database
      //only if the like number was 0 before
      StockModel.findOneAndUpdate(
        { stock: data.symbol },
        { $inc: { likes: 1 } }
      );
      //incrementing the likes in the response object since findOneAndUpdate is async
      resultObj.stockData = {
        stock: existCheck.stock,
        price: data.latestPrice.toString(),
        likes: existCheck.likes + 1
      };
    } else {
      //otherwise we just simply give the existing object's likes and stock
      resultObj.stockData = {
        stock: existCheck.stock,
        price: data.latestPrice.toString(),
        likes: existCheck.likes
      };
    }
  }
  return resultObj;
}

async function twoStock(symbol, like) {
  //the array to hold the json properties we need is made here
  let dataArr = [];
  for (let i = 0; i < symbol.length; i++) {
    //construct and fetch the data from the url for each stock
    let url = `https://repeated-alpaca.glitch.me/v1/stock/${symbol[i]}/quote`;
    let response = await fetch(url);
    let item;
    if (response.ok) {
      item = await response.json();
    } else {
      alert(`HTTP Error: ${response.status}`);
    }
    //getting the data we need into an array to use later
    let dataObj = { stock: item.symbol, price: item.latestPrice };
    dataArr.push(dataObj);
  }
  //this array is made to hold the items we matched (or didn't match) from the database
  let holderArr = [];
  for (let j = 0; j < dataArr.length; j++) {
    //first item in the array
    let item = dataArr[j];
    let existCheck = await StockModel.findOne(
      { stock: item.stock },
      (err, result) => {
        if (err === null) {
          return result;
        } else {
          console.warn(err);
        }
      }
    );
    if (existCheck === null) {
      //it doesn't exist already
      if (like) {
        // if like button was pushed, it's initialized here with 1 like
        let newModel = new StockModel({ stock: item.stock, likes: 1 });
        newModel.save(function(err) {
          if (err) return console.warn(err);
        });
        //then the object is pushed to the array we're gonna use to hold the objects
        holderArr.push({ stock: item.stock, price: item.price, likes: 1 });
      } else {
        //if the like button was pushed, it's initialized here with 0 likes
        let newModel = new StockModel({ stock: item.stock, likes: 0 });
        newModel.save(function(err) {
          if (err) return console.warn(err);
        });
        //the object is pushed to the holder array
        holderArr.push({ stock: item.stock, price: item.price, likes: 0 });
      }
    } else {
      if (like && existCheck.likes !== 1) {
        //if the item exists, we increment the likes in the database and hold the object in the array
        StockModel.findOneAndUpdate(
          { stock: item.stock },
          { $inc: { likes: 1 } }
        ).then();
        holderArr.push({
          stock: item.stock,
          price: item.price,
          likes: existCheck.likes + 1
        });
      } else {
        //we just push the item into the array
        holderArr.push({
          stock: item.stock,
          price: item.price,
          likes: existCheck.likes
        });
      }
    }
  }
  //since we know there are two objects, we can cheat a bit even though we've used loops this entire time
  //I did that since it's a lot less messy
  let firstRelLikes = holderArr[0].likes - holderArr[1].likes;
  let secondRelLikes = holderArr[1].likes - holderArr[0].likes;

  let resultObj = {};
  resultObj.stockData = [
    {
      stock: holderArr[0].stock,
      price: holderArr[0].price.toString(),
      rel_likes: firstRelLikes
    },
    {
      stock: holderArr[1].stock,
      price: holderArr[1].price.toString(),
      rel_likes: secondRelLikes
    }
  ];
  return resultObj;
}

module.exports = function(app) {
  mongoose.connect(CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  app.route("/api/stock-prices").get(async function(req, res) {
    let symbol = req.query.stock;
    let like = req.query.like;
    if(typeof(symbol) !== 'string'){
      res.json(await twoStock(symbol, like));
    }else{
      res.json(await oneStock(symbol, like));
    }
  });
};
