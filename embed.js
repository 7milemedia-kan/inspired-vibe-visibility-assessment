(function () {
  const script = document.currentScript;
  const origin = new URL(script.src).origin;
  const frame = document.createElement('iframe');
  frame.src = `${origin}/?embed=1`;
  frame.title = script.dataset.title || 'Visibility Engine Assessment';
  frame.loading = 'lazy';
  frame.style.cssText = `width:100%;height:${script.dataset.height || '720px'};border:0;border-radius:16px;display:block`;
  script.parentNode.insertBefore(frame, script.nextSibling);
}());
