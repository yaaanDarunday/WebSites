// Paste as the `function` of browser_evaluate while on https://gsap.com/showcase/
// Clicks "Load More" until the gallery is exhausted, then returns every card.
// Save the result with the `filename` option (e.g. .shots/showcase-index.json).
async () => {
  const more = () => [...document.querySelectorAll('button')]
    .find(b => /load more/i.test(b.innerText) && b.offsetParent);
  for (let i = 0; i < 60 && more(); i++) {
    more().click();
    await new Promise(r => setTimeout(r, 1200));
  }
  const seen = new Set();
  return [...document.querySelectorAll('li.filtered-gallery__item')]
    .map(li => ({
      title: li.querySelector('.filtered-gallery__heading')?.innerText.trim(),
      url: li.querySelector('a.filtered-gallery__media')?.href,
      creator: [...li.querySelectorAll('.filtered-gallery__creator a')].map(a => a.innerText.trim()).join(', '),
      // hidden pills are in the DOM too, so this is the full plugin list
      plugins: [...li.querySelectorAll('.filtered-gallery__plugin-pill:not(.filtered-gallery__plugin-count)')]
        .map(s => s.textContent.trim()),
    }))
    .filter(c => c.url && !seen.has(c.url) && seen.add(c.url));
}
