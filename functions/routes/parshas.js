const he = require("./helpers");

const parshas = (conv) => {
  let gregReady = he.dateConverter(conv.query, conv.parameters);
  if (isNaN(gregReady.month)) {
    return conv.ask(
      "I'm sorry - could you please try again, with a specific date?"
    );
  } else {
    const hebCalString = `https://www.hebcal.com/shabbat?cfg=json&geonameid=3448439&m=50&gy=${gregReady.year}&gm=${gregReady.month}&gd=${gregReady.day}&g2h=1`;
    return he
      .getHebrewDate(hebCalString)
      .then((response) => {
        let item = response.data.items.filter((i) => {
          return Object.keys(i).includes("leyning");
        });
        let filtered = item.filter((i) => {
          return i.leyning.torah !== undefined;
        });
        if (filtered[0].category === "holiday") {
          return conv.close(
            `The date you're asking about is a holiday — ${filtered[0].title}. The Torah portion is ${filtered[0].leyning.torah}`
          );
        } else {
          return conv.close(
            `The parsha is ${filtered[0].title}. That's ${filtered[0].leyning.torah}.`
          );
        }
      })
      .catch((error) => {
        console.log("Error");
      });
  }
};

module.exports ={
    parshas
}
