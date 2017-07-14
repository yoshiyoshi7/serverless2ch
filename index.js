let AWS = require("aws-sdk");
let dynamo = new AWS.DynamoDB.DocumentClient()
let client = require("cheerio-httpcli");

function numbering(title, url, img, site) {
  // sequenceを発行
  let updateParams = {
    TableName: "sequences", //　シーケンサーテーブルの名前
    Key: {
      "table_name": "its", // 番号を振り出すテーブル名
    },
    UpdateExpression: "set current_number = current_number + :val",
    ExpressionAttributeValues: {
      ":val": 1
    },
    ReturnValues: "UPDATED_NEW" // 更新のあったデータだけもってくるという指定
  };

  dynamo.update(updateParams, function (err, data) {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("番号振り出し succeeded:", JSON.stringify(data, null, 2));
      create(title, url, img, site, data.Attributes.current_number);
    }
  });
}

function exists(title, item_url, img, site) {

  let params = {
    TableName: "its_exists",
    Item: {
      "item_url": item_url,
    },
    ConditionExpression: 'attribute_not_exists(item_url)',
  };

  // ここでits_existsテーブルのレスポンス結果から分岐がしたいのだが、data==nullでもダメ出し、
  // 調べる。
  dynamo.put(params, function (err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
      numbering(title, item_url, img, site);
    }
  });




}

function create(title, url, img, site, range) {

  let params = {
    TableName: "its",
    Item: {
      "id": "its",
      "range": range,
      "title": title,
      "url": url,
      "img": img,
      "site": site,
    }
  };

  dynamo.put(params, function (err, data) {
    if (err) {
      console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
      console.log("Added item:", JSON.stringify(data, null, 2));
    }
  });
}

function async() {
  let list = [];
  let result = client.fetchSync("http://blog.livedoor.jp/itsoku/");

  result.$("article").each(function (idx) {
    let item = {
      "title": result.$(this).find("h1").text(),
      "url": result.$(this).find("a").attr("href"),
      "img": result.$(this).find("img").attr("src"),
      "site": "IT速報",
    }
    list.push(item);
  });
  return list;
}

exports.handler = (event, context, callback) => {
  let list = async();

  list.forEach(function (item) {

    // dynamodbがfetchなため、returnが使えない。
    exists(item.title, item.url, item.img, item.site);

  });
  callback(null, list);
};