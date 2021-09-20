import runAddonUserscripts from "../content-scripts/inject/run-userscript.js";
import Localization from "../content-scripts/inject/l10n.js";
import globalStateProxy from "../background/imports/global-state.js";

(async function () {
  window.scratchAddons = {};
  scratchAddons.classNames = { loaded: false };
  scratchAddons.eventTargets = {
    auth: [],
    settings: [],
    tab: [],
    self: [],
  };
  scratchAddons.session = {};
  const consoleOutput = (logAuthor = "[page]") => {
    const style = {
      // Remember to change these as well on cs.js
      leftPrefix: "background:  #ff7b26; color: white; border-radius: 0.5rem 0 0 0.5rem; padding: 0 0.5rem",
      rightPrefix:
        "background: #222; color: white; border-radius: 0 0.5rem 0.5rem 0; padding: 0 0.5rem; font-weight: bold",
      text: "",
    };
    return [`%cSA%c${logAuthor}%c`, style.leftPrefix, style.rightPrefix, style.text];
  };
  scratchAddons.console = {
    log: _realConsole.log.bind(_realConsole, ...consoleOutput()),
    warn: _realConsole.warn.bind(_realConsole, ...consoleOutput()),
    error: _realConsole.error.bind(_realConsole, ...consoleOutput()),
    logForAddon: (addonId) => _realConsole.log.bind(_realConsole, ...consoleOutput(addonId)),
    warnForAddon: (addonId) => _realConsole.warn.bind(_realConsole, ...consoleOutput(addonId)),
    errorForAddon: (addonId) => _realConsole.error.bind(_realConsole, ...consoleOutput(addonId)),
  };

  const getSession = {
    isFetching: false,
    async refetchSession() {
      let res;
      let d;
      if (this.isFetching) return;
      this.isFetching = true;
      scratchAddons.eventTargets.auth.forEach((auth) => auth._refresh());
      try {
        res = await fetch("https://scratch.mit.edu/session/", {
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
        });
        d = await res.json();
      } catch (e) {
        d = {};
        scratchAddons.console.warn("Session fetch failed: ", e);
        if ((res && !res.ok) || !res) setTimeout(() => this.refetchSession(), 60000);
      }
      scratchAddons.session = d;
      scratchAddons.eventTargets.auth.forEach((auth) => auth._update(d));
      this.isFetching = false;
    },
  };
  scratchAddons.globalState = globalStateProxy;
  console.log(
    "%cscratchAddons.globalState",
    "font-weight: bold;",
    "initialized:\n",
    JSON.parse(JSON.stringify(scratchAddons.globalState))
  );

  await loadScriptFromUrl("background/handle-auth.js");

  function getURL(url) {
    return new URL("../" + url, import.meta.url).href;
  }

  class SharedObserver {
    constructor() {
      this.inactive = true;
      this.pending = new Set();
      this.observer = new MutationObserver((mutation, observer) => {
        for (const item of this.pending) {
          if (item.condition && !item.condition()) continue;
          for (const match of document.querySelectorAll(item.query)) {
            if (item.seen?.has(match)) continue;
            if (item.elementCondition && !item.elementCondition(match)) continue;
            item.seen?.add(match);
            this.pending.delete(item);
            item.resolve(match);
            break;
          }
        }
        if (this.pending.size === 0) {
          this.inactive = true;
          this.observer.disconnect();
        }
      });
    }

    /**
     * Watches an element.
     *
     * @param {object} opts - Options
     * @param {string} opts.query - Query.
     * @param {WeakSet} [opts.seen] - A WeakSet that tracks whether an element has already been seen.
     * @param {function} [opts.condition] - A function that returns whether to resolve the selector or not.
     * @param {function} [opts.elementCondition] - A function that returns whether to resolve the selector or not, given
     *   an element.
     * @returns {Promise<Node>} Promise that is resolved with modified element.
     */
    watch(opts) {
      if (this.inactive) {
        this.inactive = false;
        this.observer.observe(document.documentElement, {
          subtree: true,
          childList: true,
        });
      }
      return new Promise((resolve) =>
        this.pending.add({
          resolve,
          ...opts,
        })
      );
    }
  }

  // Pathname patterns. Make sure NOT to set global flag!
  // Don't forget ^ and $
  const WELL_KNOWN_PATTERNS = {
    projects: /^\/projects\/(?:editor|\d+(?:\/(?:fullscreen|editor))?)\/?$/,
    projectEmbeds: /^\/projects\/\d+\/embed\/?$/,
    studios: /^\/studios\/\d+(?:\/(?:projects|comments|curators|activity))?\/?$/,
    profiles: /^\/users\/[\w-]+\/?$/,
    topics: /^\/discuss\/topic\/\d+\/?$/,
    newPostScreens: /^\/discuss\/(?:topic\/\d+|\d+\/topic\/add)\/?$/,
    editingScreens: /^\/discuss\/(?:topic\/\d+|\d+\/topic\/add|post\/\d+\/edit|settings\/[\w-]+)\/?$/,
    forums: /^\/discuss(?!\/m(?:$|\/))(?:\/.*)?$/,
    scratchWWWNoProject:
      /^\/(?:(?:about|annual-report|camp|conference\/20(?:1[79]|[2-9]\d|18(?:\/(?:[^\/]+\/details|expect|plan|schedule))?)|contact-us|credits|developers|DMCA|download(?:\/scratch2)?|educators(?:\/faq|register|waiting)?|explore\/(?:project|studio)s\/\w+(?:\/\w+)?|info\/faq|community_guidelines|ideas|join|messages|parents|privacy_policy|research|scratch_1\.4|search\/(?:project|studio)s|starter-projects|classes\/(?:complete_registration|[^\/]+\/register\/[^\/]+)|signup\/[^\/]+|terms_of_use|wedo(?:-legacy)?|ev3|microbit|vernier|boost|studios\/\d*(?:\/(?:projects|comments|curators|activity))?)\/?)?$/,
  };

  const WELL_KNOWN_MATCHERS = {
    isNotScratchWWW: (match) => {
      const { projects, projectEmbeds, scratchWWWNoProject } = WELL_KNOWN_PATTERNS;
      return !(projects.test(match) || projectEmbeds.test(match) || scratchWWWNoProject.test(match));
    },
  };

  function urlMatchesLegacyPattern(pattern, urlUrl) {
    const patternUrl = new URL(pattern);
    // We assume both URLs start with https://scratch.mit.edu

    const patternPath = patternUrl.pathname.split("/");
    const urlPath = urlUrl.pathname.split("/");
    // Implicit slash at the end of the URL path, if it's not there
    if (urlPath[urlPath.length - 1] !== "") urlPath.push("");
    // Implicit slash at the end of the pattern, unless it's a wildcard
    if (patternPath[patternPath.length - 1] !== "" && patternPath[patternPath.length - 1] !== "*") patternPath.push("");

    while (patternPath.length) {
      // shift() removes the first item of an array, and returns it
      const patternItem = patternPath.shift();
      const urlItem = urlPath.shift();
      if (patternItem !== urlItem && patternItem !== "*") return false;
    }
    return true;
  }

  function getL10NURLs() {
    const langCode = /scratchlanguage=([\w-]+)/.exec(document.cookie)?.[1] || "en";
    const urls = [getURL(`addons-l10n/${langCode}`)];
    if (langCode === "pt") {
      urls.push(getURL(`addons-l10n/pt-br`));
    }
    if (langCode.includes("-")) {
      urls.push(getURL(`addons-l10n/${langCode.split("-")[0]}`));
    }
    const enJSON = getURL("addons-l10n/en");
    if (!urls.includes(enJSON)) urls.push(enJSON);
    return urls;
  }

  scratchAddons.l10n = new Localization(getL10NURLs());

  scratchAddons.methods = {};
  scratchAddons.methods.getMsgCount = () => {
    let promiseResolver;
    const promise = new Promise((resolve) => (promiseResolver = resolve));
    pendingPromises.msgCount.push(promiseResolver);
    // 1 because the array was just pushed
    if (pendingPromises.msgCount.length === 1) requestMsgCount();
    return promise;
  };

  scratchAddons.sharedObserver = new SharedObserver();
  async function onDataReady() {
    const addons = (await fetch(getURL("addons/addons.json")).then((r) => r.json())).filter(
      (addon) => !addon.startsWith("//")
    );

    addons.forEach(async (addonId) => {
      const manifest = await fetch(getURL("addons/" + addonId + "/addon.json")).then((r) => r.json());
      for (let injectable of manifest.userscripts || []) {
        injectable = parseMatches(injectable);
      }
      for (let injectable of manifest.userstyles || []) {
        injectable = parseMatches(injectable);
      }

      manifest.userstyles = manifest.userstyles?.filter((injectable) =>
        userscriptMatches({ url: location.href }, injectable, addonId)
      );
      manifest.userscripts = manifest.userscripts?.filter((injectable) =>
        userscriptMatches({ url: location.href }, injectable, addonId)
      );
      function run() {
        if (manifest.userscripts) runAddonUserscripts({ addonId, scripts: manifest.userscripts });

        for (let [index, injectable] of (manifest.userstyles || []).entries()) {
          addStyle({
            addonId,
            userstyle: getURL("addons/" + addonId + "/" + injectable.url),
            injectAsStyleElt: manifest.injectAsStyleElt,
            index,
          });
        }
      }
      // Note: we currently load userscripts and locales after head loaded
      // We could do that before head loaded just fine, as long as we don't
      // actually *run* the addons before document.head is defined.
      if (document.head) run();
      else {
        const observer = new MutationObserver(() => {
          if (document.head) {
            run();
            observer.disconnect();
          }
        });
        observer.observe(document.documentElement, { subtree: true, childList: true });
      }
    });

    // regexPattern = "^https:(absolute-regex)" | "^(relative-regex)"
    // matchesPattern = "*" | regexPattern | Array<wellKnownName | wellKnownMatcher | regexPattern | legacyPattern>
    function userscriptMatches(data, scriptOrStyle, addonId) {
      // if (scriptOrStyle.if && !matchesIf(scriptOrStyle, scratchAddons.globalState.addonSettings[addonId])) return false;
      // todo ^

      const url = data.url;
      const parsedURL = new URL(url);
      const { matches, _scratchDomainImplied } = scriptOrStyle;
      const parsedPathname = parsedURL.pathname;
      const parsedOrigin = parsedURL.origin;
      const originPath = parsedOrigin + parsedPathname;
      const matchURL = _scratchDomainImplied ? parsedPathname : originPath;
      const scratchOrigin = "https://scratch.mit.edu";
      const isScratchOrigin = parsedOrigin === scratchOrigin;
      // "*" is used for any URL on Scratch origin
      if (matches === "*") return isScratchOrigin;
      // matches becomes RegExp if it is a string that starts with ^
      if (matches instanceof RegExp) {
        if (_scratchDomainImplied && !isScratchOrigin) return false;
        return matches.test(matchURL);
      }
      for (const match of matches) {
        if (match instanceof RegExp) {
          if (match._scratchDomainImplied && !isScratchOrigin) continue;
          if (match.test(match._scratchDomainImplied ? parsedPathname : originPath)) {
            return true;
          }
        } else if (Object.prototype.hasOwnProperty.call(WELL_KNOWN_PATTERNS, match)) {
          if (isScratchOrigin && WELL_KNOWN_PATTERNS[match].test(parsedPathname)) return true;
        } else if (Object.prototype.hasOwnProperty.call(WELL_KNOWN_MATCHERS, match)) {
          if (isScratchOrigin && WELL_KNOWN_MATCHERS[match](parsedPathname)) return true;
        } else if (urlMatchesLegacyPattern(match, parsedURL)) return true;
      }
      return false;
    }

    function parseMatches(injectable) {
      const { matches } = injectable;
      if (typeof matches === "string" && matches.startsWith("^")) {
        injectable._scratchDomainImplied = !matches.startsWith("^https:");
        injectable.matches = new RegExp(matches, "u");
      } else if (Array.isArray(matches)) {
        for (let i = matches.length; i--; ) {
          const match = matches[i];
          if (typeof match === "string" && match.startsWith("^")) {
            matches[i] = new RegExp(match, "u");
            matches[i]._scratchDomainImplied = !match.startsWith("^https:");
          }
        }
      }
      return injectable;
    }
    function addStyle(addon) {
      const allStyles = [...document.querySelectorAll(".scratch-addons-style")];

      const appendByIndex = (el, index) => {
        // Append a style element in the correct place preserving order
        const nextElement = allStyles.find((el) => Number(el.getAttribute("data-addon-index") > index));
        if (nextElement) document.documentElement.insertBefore(el, nextElement);
        else {
          if (document.body) document.documentElement.insertBefore(el, document.body);
          else document.documentElement.appendChild(el);
        }
      };

      if (addon.injectAsStyleElt) {
        const style = document.createElement("style");
        style.classList.add("scratch-addons-style");
        style.setAttribute("data-addon-id", addon.addonId);
        style.setAttribute("data-addon-index", addon.index);
        fetch(addon.userstyle)
          .then((res) => res.text())
          .then((res) => (style.textContent = res));
        appendByIndex(style, addon.index);
      } else {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.setAttribute("data-addon-id", addon.addonId);
        link.setAttribute("data-addon-index", addon.index);
        link.classList.add("scratch-addons-style");
        link.href = addon.userstyle;
        appendByIndex(link, addon.index);
      }
    }
  }

  function loadClasses() {
    scratchAddons.classNames.arr = [
      ...new Set(
        [...document.styleSheets]
          .filter(
            (styleSheet) =>
              !(
                styleSheet.ownerNode.textContent.startsWith(
                  "/* DO NOT EDIT\n@todo This file is copied from GUI and should be pulled out into a shared library."
                ) &&
                (styleSheet.ownerNode.textContent.includes("input_input-form") ||
                  styleSheet.ownerNode.textContent.includes("label_input-group_"))
              )
          )
          .map((e) => {
            try {
              return [...e.cssRules];
            } catch (e) {
              return [];
            }
          })
          .flat()
          .map((e) => e.selectorText)
          .filter((e) => e)
          .map((e) => e.match(/(([\w-]+?)_([\w-]+)_([\w\d-]+))/g))
          .filter((e) => e)
          .flat()
      ),
    ];
    scratchAddons.classNames.loaded = true;

    const fixPlaceHolderClasses = () =>
      document.querySelectorAll("[class*='scratchAddonsScratchClass/']").forEach((el) => {
        [...el.classList]
          .filter((className) => className.startsWith("scratchAddonsScratchClass"))
          .map((className) => className.substring(className.indexOf("/") + 1))
          .forEach((classNameToFind) =>
            el.classList.replace(
              `scratchAddonsScratchClass/${classNameToFind}`,
              scratchAddons.classNames.arr.find(
                (className) =>
                  className.startsWith(classNameToFind + "_") && className.length === classNameToFind.length + 6
              ) || `scratchAddonsScratchClass/${classNameToFind}`
            )
          );
      });

    fixPlaceHolderClasses();
    new MutationObserver(() => fixPlaceHolderClasses()).observe(document.documentElement, {
      attributes: false,
      childList: true,
      subtree: true,
    });
  }

  if (document.querySelector("title")) loadClasses();
  else {
    const stylesObserver = new MutationObserver(() => {
      if (document.querySelector("title")) {
        stylesObserver.disconnect();
        loadClasses();
      }
    });
    stylesObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function loadScriptFromUrl(url) {
    return new Promise((resolve, reject) => {
      const script = Object.assign(document.createElement("script"), {
        src: getURL(url),
      });
      script.addEventListener("load", () => {
        resolve();
      });
      document.body.append(script);
    });
  }

  onDataReady();
  getSession.refetchSession();
})();
