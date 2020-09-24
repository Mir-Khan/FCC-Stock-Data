/*
 *
 *
 *       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
 *       -----[Keep the tests in the same order!]-----
 *       (if additional are added, keep them at the very end!)
 */

var chaiHttp = require("chai-http");
var chai = require("chai");
var assert = chai.assert;
var server = require("../server");
var fetch = require("node-fetch");

async function dbColl(stock) {
  //getting the price
  let url = "https://repeated-alpaca.glitch.me/v1/stock/" + stock + "/quote";
  let response = await fetch(url);
  var data;
  if (response.ok) {
    data = await response.json();
  } else {
    alert(`HTTP Error: ${response.status}`);
  }
  return data.latestPrice;
}

chai.use(chaiHttp);
suite("Functional Tests", function() {
  suite("GET /api/stock-prices => stockData object", function() {
    test("1 stock", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "goog" })
        .end(async function(err, res) {
          // getting the price
          let price = await dbColl("goog");
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.stock, "GOOG");
          assert.equal(res.body.stockData.price, price.toString());
          done();
        });
    });

    test("1 stock with like", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "msft", like: true })
        .end(async function(err, res) {
          // getting the price
          let price = await dbColl("msft");
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.stock, "MSFT");
          assert.equal(res.body.stockData.price, price.toString());
          assert.equal(res.body.stockData.likes, 1);
          done();
        });
    });

    test("1 stock with like again (ensure likes arent double counted)", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({ stock: "msft", like: true })
        .end(async function(err, res) {
          // getting the price
          let price = await dbColl("msft");
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData.stock, "MSFT");
          assert.equal(res.body.stockData.price, price.toString());
          assert.notEqual(res.body.stockData.likes, 2);
          done();
        });
    });

    test("2 stocks", function(done) {
      chai
        .request(server)
        .get("/api/stock-prices")
        .query({stock: ["msft", "goog"]})
        .end(async function(err, res) {
          // getting the price
          let priceOne = await dbColl("msft");
          let priceTwo = await dbColl("goog");
          assert.equal(res.status, 200);
          assert.equal(res.body.stockData[0].stock, "MSFT");
          assert.equal(res.body.stockData[1].stock, "GOOG")
          assert.equal(res.body.stockData[0].price, priceOne.toString());
          assert.equal(res.body.stockData[1].price, priceTwo.toString())
          assert.equal(res.body.stockData[0].rel_likes, -1);
          assert.equal(res.body.stockData[1].rel_likes, 1);
          done();
        });
    });

    test("2 stocks with like", function(done) {
      chai.request(server).get("/api/stock-prices").query({stock: ["goog", "nkla"], like: true}).end(async function(err, res){
        let priceOne = await dbColl("goog");
        let priceTwo = await dbColl("nkla");
        
        assert.equal(res.status, 200)
        assert.equal(res.body.stockData[0].stock, "GOOG")
        assert.equal(res.body.stockData[1].stock, "NKLA")
        assert.equal(res.body.stockData[0].price, priceOne.toString())
        assert.equal(res.body.stockData[1].price, priceTwo.toString())
        assert.equal(res.body.stockData[0].rel_likes, 0)
        assert.equal(res.body.stockData[1].rel_likes, 0)
        done();
      })
    });
  });
});
