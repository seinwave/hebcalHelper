const welcome = (conv) => {
    conv.user.storage = {};
  conv.ask(
    "Hey there! I'm the Hebrew Calendar. Ask me about Torah parshas, Hebrew dates, Jewish holidays, or candle lighting times!"
  );
};

module.exports = {
  welcome,
};
