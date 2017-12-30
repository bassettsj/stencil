import { BuildConfig, BuildContext, ComponentRegistry, Diagnostic, HostElement,
  HydrateOptions, HydrateResults, PlatformApi, VNode } from '../util/interfaces';
import { connectedCallback } from '../core/instance/connected';
import { createDomApi } from '../core/renderer/dom-api';
import { createPlatformServer } from './platform-server';
import { ENCAPSULATION, SSR_VNODE_ID } from '../util/constants';
import { initLoad } from '../core/instance/init-component';
import { optimizeHtml } from '../compiler/html/optimize-html';
import { proxyHostElementPrototype } from '../core/instance/proxy';


export function hydrateHtml(config: BuildConfig, ctx: BuildContext, cmpRegistry: ComponentRegistry, opts: HydrateOptions): Promise<HydrateResults> {
  return new Promise(resolve => {

    const hydrateResults: HydrateResults = {
      diagnostics: [],
      url: opts.url,
      html: opts.html,
      styles: null,
      anchors: [],
      components: [],
      styleUrls: [],
      scriptUrls: [],
      imgUrls: []
    };

    const registeredTags = Object.keys(cmpRegistry || {});
    let ssrIds = 0;

    // if there are no components registered at all
    // then let's skip all this (and why didn't we get components!?)
    if (registeredTags.length === 0) {
      hydrateResults.diagnostics.push({
        header: 'Hydrate Components',
        messageText: `No registered components found`,
        type: 'hydrate',
        level: 'info'
      });
      hydrateResults.html = opts.html;
      resolve(hydrateResults);
      return;
    }

    // create a emulated window
    // attach data the request to the window
    const dom = config.sys.createDom();
    const win = dom.parse(opts);
    const doc = win.document;
    const domApi = createDomApi(win, doc);

    // normalize dir and lang before connecting elements
    // so that the info is their incase they read it at runtime
    normalizeDirection(doc, opts);
    normalizeLanguage(doc, opts);

    // create the platform
    const plt = createPlatformServer(
      config,
      win,
      doc,
      domApi,
      hydrateResults.diagnostics,
      opts.isPrerender,
      ctx
    );

    // fully define each of our components onto this new platform instance
    registeredTags.forEach(registryTag => {
      cmpRegistry[registryTag].tagNameMeta = registryTag.toLowerCase().trim();
      plt.defineComponent(cmpRegistry[registryTag]);
    });

    // fire off this function when the app has finished loading
    // and all components have finished hydrating
    plt.onAppLoad = (rootElm, styles, failureDiagnostic: Diagnostic) => {

      if (config._isTesting) {
        (hydrateResults as any).__testPlatform = plt;
      }

      if (failureDiagnostic) {
        hydrateResults.html = generateFailureDiagnostic(failureDiagnostic);
        resolve(hydrateResults);
        return;
      }

      hydrateResults.root = rootElm;

      // all synchronous operations next
      if (rootElm) {
        try {
          // optimize this document!!
          optimizeHtml(config, ctx, doc, styles, opts, hydrateResults);

          // gather up all of the <a> tag information in the doc
          if (opts.collectAnchors !== false) {
            collectAnchors(doc, hydrateResults);
          }

          // serialize this dom back into a string
          if (opts.serializeHtml !== false) {
            hydrateResults.html = dom.serialize();
          }

          // also collect up any dom errors that may have happened
          hydrateResults.diagnostics = hydrateResults.diagnostics.concat(dom.getDiagnostics());

        } catch (e) {
          // gahh, something's up
          hydrateResults.diagnostics.push({
            level: 'error',
            type: 'hydrate',
            header: 'DOM Serialize',
            messageText: e
          });

          // idk, some error, just use the original html
          hydrateResults.html = opts.html;
        }
      }

      // cool, all good here, even if there are errors
      // we're passing back the result object
      resolve(hydrateResults);
    };

    // patch the render function that we can add SSR ids
    // and to connect any elements it may have just appened to the DOM
    const pltRender = plt.render;
    plt.render = function render(oldVNode: VNode, newVNode, isUpdate, hostContentNodes, encapsulation) {
      let ssrId: number;
      let existingSsrId: string;

      if (opts.ssrIds !== false) {
        // this may have been patched more than once
        // so reuse the ssr id if it already has one
        if (oldVNode && oldVNode.elm) {
          existingSsrId = (oldVNode.elm as HTMLElement).getAttribute(SSR_VNODE_ID);
        }

        if (existingSsrId) {
          ssrId = parseInt(existingSsrId, 10);
        } else {
          ssrId = ssrIds++;
        }
      }

      newVNode = pltRender(oldVNode, newVNode, isUpdate, hostContentNodes, encapsulation, ssrId);

      connectElement(plt, <HostElement>newVNode.elm, hydrateResults, config.hydratedCssClass);

      return newVNode;
    };

    // loop through each node and start connecting/hydrating
    // any elements that are host elements to components
    // this kicks off all the async loading and hydrating
    connectElement(plt, <any>win.document.body, hydrateResults, config.hydratedCssClass);

    if (hydrateResults.components.length === 0) {
      // what gives, never found ANY host elements to connect!
      // ok we're just done i guess, idk
      hydrateResults.html = opts.html;
      resolve(hydrateResults);
    }
  });
}


export function connectElement(plt: PlatformApi, elm: HostElement, hydrateResults: HydrateResults, hydratedCssClass: string) {
  if (!elm.$connected) {
    // only connect elements which is a registered component
    const tagName = elm.tagName.toLowerCase();
    const cmpMeta = plt.getComponentMeta(elm);

    if (cmpMeta) {

      if (cmpMeta.encapsulation !== ENCAPSULATION.ShadowDom) {
        elm.$initLoad = () => {
          initLoad(plt, elm, hydratedCssClass);
        };

        proxyHostElementPrototype(plt, cmpMeta.membersMeta, elm);

        connectedCallback(plt, cmpMeta, elm);
      }

      const depth = getDepth(elm);

      const cmp = hydrateResults.components.find(c => c.tag === tagName);
      if (cmp) {
        cmp.count++;
        if (depth > cmp.depth) {
          cmp.depth = depth;
        }

      } else {
        hydrateResults.components.push({
          tag: tagName,
          count: 1,
          depth: depth
        });
      }

    } else if (tagName === 'script') {
      const src = (elm as any).src;
      if (src && hydrateResults.scriptUrls.indexOf(src) === -1) {
        hydrateResults.scriptUrls.push(src);
      }

    } else if (tagName === 'link') {
      const href = (elm as any).href;
      const rel = ((elm as any).rel || '').toLowerCase();
      if (rel === 'stylesheet' && href && hydrateResults.styleUrls.indexOf(href) === -1) {
        hydrateResults.styleUrls.push(href);
      }

    } else if (tagName === 'img') {
      const src = (elm as any).src;
      if (src && hydrateResults.imgUrls.indexOf(src) === -1) {
        hydrateResults.imgUrls.push(src);
      }

    }
  }

  const elmChildren = elm.children;
  if (elmChildren) {
    // continue drilling down through child elements
    for (var i = 0, l = elmChildren.length; i < l; i++) {
      connectElement(plt, <HostElement>elmChildren[i], hydrateResults, hydratedCssClass);
    }
  }
}


function collectAnchors(doc: Document, hydrateResults: HydrateResults) {
  const anchorElements = doc.querySelectorAll('a');

  for (var i = 0; i < anchorElements.length; i++) {
    var attrs: any = {};
    var anchorAttrs = anchorElements[i].attributes;

    for (var j = 0; j < anchorAttrs.length; j++) {
      attrs[anchorAttrs[j].nodeName.toLowerCase()] = anchorAttrs[j].nodeValue;
    }

    hydrateResults.anchors.push(attrs);
  }
}


function normalizeDirection(doc: Document, opts: HydrateOptions) {
  let dir = doc.body.getAttribute('dir');
  if (dir) {
    dir = dir.trim().toLowerCase();
    if (dir.trim().length > 0) {
      console.warn(`dir="${dir}" should be placed on the <html> instead of <body>`);
    }
  }

  if (opts.dir) {
    dir = opts.dir;
  } else {
    dir = doc.documentElement.getAttribute('dir');
  }

  if (dir) {
    dir = dir.trim().toLowerCase();
    if (dir !== 'ltr' && dir !== 'rtl') {
      console.warn(`only "ltr" and "rtl" are valid "dir" values on the <html> element`);
    }
  }

  if (dir !== 'ltr' && dir !== 'rtl') {
    dir = 'ltr';
  }

  doc.documentElement.dir = dir;
}


function normalizeLanguage(doc: Document, opts: HydrateOptions) {
  let lang = doc.body.getAttribute('lang');
  if (lang) {
    lang = lang.trim().toLowerCase();
    if (lang.trim().length > 0) {
      console.warn(`lang="${lang}" should be placed on <html> instead of <body>`);
    }
  }

  if (opts.lang) {
    lang = opts.lang;
  } else {
    lang = doc.documentElement.getAttribute('lang');
  }

  if (lang) {
    lang = lang.trim().toLowerCase();
    if (lang.length > 0) {
      doc.documentElement.lang = lang;
    }
  }
}


function getDepth(elm: Node) {
  let depth = 0;

  while (elm.parentNode) {
    depth++;
    elm = elm.parentNode;
  }

  return depth;
}


function generateFailureDiagnostic(d: Diagnostic) {
  return `
    <div style="padding: 20px;">
      <div style="font-weight: bold;">${d.header}</div>
      <div>${d.messageText}</div>
    </div>
  `;
}
