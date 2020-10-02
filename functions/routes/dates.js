const he = require("./helpers");

function ReadyDate(gregDate, hebDate) {
  (this.gregDate = gregDate), (this.hebDate = hebDate);
}

const dates = (conv) => {
  let gregReady = he.dateConverter(conv.query, conv.parameters);
  if (isNaN(gregReady.month)) {
    return conv.ask("I'm sorry - could you please specify a date?");
  } else {
    const hebCalString = `https://www.hebcal.com/converter?cfg=json&gy=${gregReady.year}&gm=${gregReady.month}&gd=${gregReady.day}&g2h=1`;
    return he
      .getHebrewDate(hebCalString)
      .then((response) => {
        const processedDate = new ReadyDate(gregReady, response.data);
        return conv.ask(
          `It's the ${processedDate.hebDate.hd} of ${processedDate.hebDate.hm}, in the year ${processedDate.hebDate.hy}.`
        );
      })
      .catch((error) => {
        console.log(error);
      });
  }
};

module.exports = {
  dates,
};
