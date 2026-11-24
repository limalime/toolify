// the theme key predates the current provider so a stored choice survives.
export const THEME_STORAGE_KEY = "theme";

// runs before first paint. a static string on purpose: inlining a function
// through toString lets the bundler touch the source and break it.
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t="dark"}var r=document.documentElement;if(t==="light"){r.classList.remove("dark")}else{r.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}})();`;
