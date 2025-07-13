import { createState, type Component, type Stateful } from "dreamland/core";

declare const vivaldiWindowId: number;

type Tab = Stateful<{
  id: number;
  showDevtools: boolean;
  favicon: string | null;
  title: string | null;
  url: string | null;
}>;

const state: Stateful<{
  extensions: chrome.management.ExtensionInfo[];
  tabs: Tab[];
  activetab: Tab;
}> = createState({
  extensions: [],
  tabs: [],
});

let shell = <div id="shell" style="flex: 1; width: auto; height: auto"></div>;

async function updateTabs() {
  console.error("?");
  const tabs = await chrome.tabs.query({
    windowId: vivaldiWindowId,
  });
  for (const tab of tabs) {
    if (!tab.id) continue;

    let existingTab = state.tabs.find((t) => t.id === tab.id);
    const updateMeta = (dt: Tab) => {
      dt.favicon = tab.favIconUrl || null;
      dt.title = tab.title || null;
      dt.url = tab.url || null;
    };
    if (existingTab) {
      updateMeta(existingTab);

      if (tab.active) state.activetab = existingTab;
    } else {
      let t = createState({
        id: tab.id,
        showDevtools: false,
      }) as Tab;
      updateMeta(t);
      state.tabs.push(t);

      shell.append(
        <TabStack id={tab.id} showDevtools={use(t.showDevtools)}></TabStack>,
      );

      if (tab.active) state.activetab = t;
    }
  }
  const deleted = state.tabs.filter(
    (t) => !tabs.some((tab) => tab.id === t.id),
  );
  for (const t of deleted) {
    state.tabs.splice(state.tabs.indexOf(t), 1);
  }
  state.tabs = state.tabs;
}

async function init() {
  try {
    state.extensions = await chrome.management.getAll();

    chrome.tabs.onUpdated.addListener(updateTabs);
    chrome.tabs.onCreated.addListener(updateTabs);
    chrome.tabs.onRemoved.addListener(updateTabs);
    chrome.tabs.onActivated.addListener(updateTabs);
    chrome.tabs.onReplaced.addListener(updateTabs);
    chrome.tabs.onMoved.addListener(updateTabs);
    chrome.tabs.onDetached.addListener(updateTabs);
    chrome.tabs.onAttached.addListener(updateTabs);
    chrome.tabs.onZoomChange.addListener(updateTabs);
    chrome.tabs.onHighlighted.addListener(updateTabs);

    vivaldi.devtoolsPrivate.onDockingStateChanged.addListener((e, a) => {
      let tab = state.tabs.find((t) => t.id === e)!;
      if (a == "off") {
        tab.showDevtools = false;
      } else {
        tab.showDevtools = true;
      }
    });
    vivaldi.devtoolsPrivate.onDockingSizesChanged.addListener((e, a) => {
      console.log("Docking sizes changed", e, a);
    });

    let built = <App></App>;
    built.id = "app";
    document.body.append(built);
  } catch (e) {
    document.body.append(new Text("error" + e.message + e.stack));
  }
}
init();

const TabStack: Component<
  {
    id: number;
    showDevtools: boolean;
  },
  {}
> = function () {
  return (
    <div class:active={use(state.activetab).map((t) => t?.id === this.id)}>
      <webview
        role="document"
        id={this.id}
        tab_id={this.id}
        style="flex: 1; width: auto; height: auto"
      ></webview>
      {use(this.showDevtools).map(
        (t) =>
          (t && (
            <webview
              style="height: auto"
              name="vivaldi-devtools-main"
              inspect_tab_id={this.id}
            ></webview>
          )) ||
          "",
      )}
    </div>
  );
};
TabStack.css = `
  :scope {
    width: 100%;
    height: 100%;
    display: none;
  }
  :scope.active {
    display: flex;
  }
`;

export const App: Component<
  {},
  {
    stacks: HTMLElement;
    extensions: any[];
  }
> = function (cx) {
  this.extensions = [];

  async function openExtension(id) {
    const data = await new Promise((resolve) => {
      vivaldi.extensionActionUtils.executeExtensionAction(
        id,
        vivaldiWindowId,
        resolve,
      );
    });
    cx.root.append(
      <dialog
        open
        style="position: absolute; top: 50%; left: 50%; width: 380px; height: 380px; transform: translate(-50%, -50%);"
      >
        <webview
          windowId={vivaldiWindowId}
          vivaldi_view_type="extension_popup"
          src={data.popupUrl}
          style="width: 380px; height: 600px;"
        ></webview>
      </dialog>,
    );
  }

  return (
    <div>
      <div class="tabs">
        {use(state.tabs).mapEach((t) => (
          <button
            class="tab"
            class:active={use(state.activetab).map((at) => at?.id === t.id)}
            on:click={() => {
              // activate tab
              chrome.tabs.update(t.id, { active: true });
            }}
            on:auxclick={(e) => {
              if (e.button === 1) {
                // close tab
                chrome.tabs.remove(t.id);
              }
            }}
          >
            <img
              width="16"
              height="16"
              src={`chrome://favicon/size/16/iconurl/${t.favicon}`}
            ></img>
            {t.title}
          </button>
        ))}
        <button
          on:click={() => {
            chrome.tabs.create({
              windowId: vivaldiWindowId,
              url: "chrome://newtab",
            });
          }}
        >
          new tab
        </button>
      </div>
      <div class="omnibox">
        <input
          value={use(state.activetab).map((t) => t?.url)}
          on:change={(e) => {
            const url = e.target.value;
            if (url) {
              // update active tab url
              chrome.tabs.update(state.activetab.id, { url });
            }
          }}
        />
        <button
          on:click={() => {
            vivaldi.devtoolsPrivate.toggleDevtools(vivaldiWindowId, "console");
          }}
        >
          devtools
        </button>
        {use(state.extensions).mapEach((e) => (
          <button on:click={() => openExtension(e.id)}>
            <img src={e.icons?.[0]?.url} alt={e.name} width="16" height="16" />
          </button>
        ))}
      </div>
      {shell}
    </div>
  );
};
App.css = `
  .tabs {
    display: flex;
  }
  .tab {
    display: flex;
    align-items: center;
  }
  .tab.active {
    background-color: white;
  }
  .omnibox {
    display: flex;
    align-items: center;
  }
  input {
  flex: 1;
  }
`;
setTimeout(async () => {
  vivaldi.windowPrivate.create(
    "chrome://inspect",
    {
      bounds: {
        left: 10,
        top: 10,
        width: 100,
        height: 100,
      },
    },
    "popup",
  );
  // console.log("????");
  // const t = document.createElement("webview");
  // // t.setAttribute("windowId", id);
  // // t.setAttribute("autosize", "on");
  // // t.setAttribute("minwidth", String(28));
  // // t.setAttribute("minheight", String(28));
  // // t.setAttribute("maxwidth", String(n));
  // // t.setAttribute("maxheight", String(i));
  // // t.setAttribute("partition", "persist:" + a);
  // // t.setAttribute("class", "ignore-react-onclickoutside");
  // // t.setAttribute("vivaldi_view_type", "extension_popup");
  // t.setAttribute("src", "chrome://inspect");
  // document.body.appendChild(t);

  // vivaldi.devtoolsPrivate.onClosed.addListener(console.log);
  // vivaldi.devtoolsPrivate.onDevtoolsUndocked.addListener(console.log);
  // vivaldi.tabsPrivate.onTabIsAttached.addListener(console.log);
  // vivaldi.tabsPrivate.onTabIsDetached.addListener(console.log);
}, 100);
