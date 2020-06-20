export class EmptyAdReloader {
  constructor() {
    // show previously hidden ads on window resize
    window.onresize = function () {
      const emptyAds = Array.from(document.querySelectorAll("ins")).filter(
        function (elem) {
          return !elem.children.length && elem.offsetHeight > 0;
        }
      );
      emptyAds.forEach(function (elem) {
        delete elem.dataset.adsbygoogleStatus;
        let adsbygoogle = (window as any).adsbygoogle || [];
        adsbygoogle.push({});
      });
    };
  }
}
