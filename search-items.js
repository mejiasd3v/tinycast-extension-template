const React = require("react");
const { List, Detail, ActionPanel, Action, Clipboard, Icon, showToast, Toast } = require("@raycast/api");

const h = React.createElement;

// Replace these records with your own data. Keep IDs stable across refreshes.
const items = [
  {
    id: "tinycast",
    title: "Tinycast",
    category: "Documentation",
    url: "https://tinycast.dev/docs/extensions",
    description: "Learn how to install and use extensions in Tinycast.",
  },
  {
    id: "raycast-api",
    title: "Raycast API",
    category: "Documentation",
    url: "https://developers.raycast.com",
    description: "API reference for the components and actions that Tinycast implements in part.",
  },
  {
    id: "example",
    title: "Example Resource",
    category: "Examples",
    url: "https://example.com",
    description: "Replace this record with a resource from your own extension.",
  },
];
const categories = [...new Set(items.map((item) => item.category))];

async function copyURL(item) {
  try {
    await Clipboard.copy(item.url);
    await showToast({ style: Toast.Style.Success, title: "URL copied" });
  } catch {
    await showToast({ style: Toast.Style.Failure, title: "Could not copy URL" });
  }
}

function itemActions(item, includeDetail = false) {
  return h(ActionPanel, null,
    includeDetail && h(Action.Push, { title: "View Details", target: h(ItemDetail, { item }) }),
    h(Action.OpenInBrowser, { title: "Open URL", url: item.url }),
    h(Action, { title: "Copy URL", onAction: () => copyURL(item) }),
  );
}

function ItemDetail({ item }) {
  return h(Detail, {
    markdown: item.description,
    metadata: h(Detail.Metadata, null,
      h(Detail.Metadata.Label, { title: "Title", text: item.title }),
      h(Detail.Metadata.Label, { title: "Category", text: item.category }),
      h(Detail.Metadata.Link, { title: "URL", text: item.url, target: item.url }),
    ),
    actions: itemActions(item),
  });
}

function SearchItems() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const search = query.trim().toLowerCase();
  const matches = items.filter((item) =>
    (category === "all" || category === item.category) &&
    `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(search),
  );

  return h(List, {
    filtering: false,
    onSearchTextChange: setQuery,
    searchBarPlaceholder: "Search example items",
    searchBarAccessory: h(List.Dropdown, { tooltip: "Category", value: category, onChange: setCategory },
      h(List.Dropdown.Item, { title: "All Categories", value: "all" }),
      ...categories.map((value) => h(List.Dropdown.Item, { key: value, title: value, value })),
    ),
  },
    matches.length === 0
      ? h(List.EmptyView, { title: "No matching items", description: "Try another search or category." })
      : matches.map((item) => h(List.Item, {
        key: item.id,
        id: item.id,
        title: item.title,
        subtitle: item.category,
        icon: Icon.Document,
        actions: itemActions(item, true),
      })),
  );
}

exports.default = SearchItems;
