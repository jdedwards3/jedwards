declare var ad1: any, ad2: any, ad3: any, ad4: any, ad5: any, ad6: any;

const adCheck = function () {
  const googletag = (window as any).googletag;

  if (window.innerWidth > 767) {
    googletag.cmd.push(function () {
      googletag.pubads().refresh([ad1, ad4, ad5]);
    });
  } else {
    googletag.cmd.push(function () {
      googletag.pubads().refresh([ad2, ad3, ad6]);
    });
  }
};

const adReload = function (t: any) {
  const googletag = (window as any).googletag as any;

  googletag.cmd.push(function () {
    googletag.pubads().clear();
  });

  clearTimeout(t);
  t = setTimeout(() => {
    adCheck();
  }, 1500);

  return t;
};

export { adCheck, adReload };
