if (
  window.location.protocol === "file:" &&
  !window.location.pathname.includes("/dist/")
) {
  window.location.replace(new URL("./dist/index.html", window.location.href));
}
