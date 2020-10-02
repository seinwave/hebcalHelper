const he = require("./helpers");

const month = new Array();
month[0] = "January";
month[1] = "February";
month[2] = "March";
month[3] = "April";
month[4] = "May";
month[5] = "June";
month[6] = "July";
month[7] = "August";
month[8] = "September";
month[9] = "October";
month[10] = "November";
month[11] = "December";

const holidays = (conv) => {
  let gregReady = he.dateConverter(conv.query, conv.parameters);
  const hebCalString = `https://www.hebcal.com/hebcal?v=1&cfg=json&min=on&maj=on&year=${gregReady.year}`;
  console.log("API CALL:", hebCalString);
  const holiday = conv.parameters["major-holiday"];
  return he
    .getHebrewDate(hebCalString)
    .then((response) => {
      let result = response.data.items.filter((i) => {
        return i.title.toLowerCase().includes(holiday);
      });

      let noErevs = result.filter((i) => {
        return !i.title.toLowerCase().includes("erev");
      });
      const date = new Date(noErevs[0].date);
      console.log("DATE:", date);
      if (date < Date.now()) {
        return conv.ask(
          `In ${gregReady.year}, ${holiday} was on ${
            month[date.getMonth()]
          } ${date.getDate()}.`
        );
      } else {
        return conv.ask(
          `In ${gregReady.year}, ${holiday} is on ${
            month[date.getMonth()]
          } ${date.getDate()}.`
        );
      }
    })
    .catch((error) => {
      console.log(error);
    });
};

module.exports = {
  holidays,
};
