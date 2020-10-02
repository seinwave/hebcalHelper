const he = require("./helpers");
const cities = require("../cities");
const {Permission} = require("actions-on-google");

const candles = (conv) => {
  console.log("USER STORAGE:", conv.user);

  if (conv.user.storage.location === undefined) {
    conv.ask(
      new Permission({
        context: "To tell you precise candle lighting times",
        permissions: ["NAME", "DEVICE_PRECISE_LOCATION"],
      })
    );
  } else {
    let gregReady = he.dateConverter(conv.query, conv.parameters);
    const { city } = conv.user.storage.location;
    const cityMatches = cities.cities.filter((i) => {
      return i.name === city;
    });
    const geoname = cityMatches[0].geonameid;
    let hebCalString;
    if (geoname !== undefined) {
      hebCalString = `https://www.hebcal.com/shabbat?cfg=json&geoname=${geoname}&m=50&gy=${gregReady.year}&gm=${gregReady.month}&gd=${gregReady.day}&g2h=1`;
    } else {
      hebCalString = `https://www.hebcal.com/shabbat?cfg=json&geoname=281184&m=50&gy=${gregReady.year}&gm=${gregReady.month}&gd=${gregReady.day}&g2h=1`;
    }
    return he
      .getHebrewDate(hebCalString)
      .then((response) => {
        const candleItem = response.data.items.filter((i) =>
          i.title.includes("Candle lighting")
        );
        const timeSentence = candleItem[0].title;
        const timeRegEx = /([0-1]?[0-9]|2[0-3]):[0-5][0-9][a-z][a-z]$/gim;
        const time = timeSentence.match(timeRegEx);
        return conv.ask(`Light the Shabbat candles at ${time[0]}.`);
      })
      .catch((error) => {
        console.log(error);
      });
  }
};

module.exports = {
  candles,
};
