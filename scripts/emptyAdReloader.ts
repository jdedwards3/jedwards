export class EmptyAdReloader {
  constructor(emptyAds: HTMLModElement[]) {
    emptyAds.forEach(function (elem) {
      delete elem.dataset.adsbygoogleStatus;
      let adsbygoogle = (window as any).adsbygoogle || [];
      adsbygoogle.push({});
    });
  }
}
