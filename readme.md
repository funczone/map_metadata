# map_metadata
Server code for https://maps.func.zone.

## Installation
1. Install imagemagick, and add it to your path.
2. Clone the repo.
3. Enter the repo, and `npm i`.
4. `node index.js`

Put all data in the `data` folder.

## `data/`
The data folder holds all the data that the server will serve. 

Previews are full size previews of map images, named the same thing as the map itself. All images must be formatted as `.png`, and must be 1080p (1920×1080 pixels).

Thumbnails are generated automatically and cached in memory.

All maps should be captured in a way where they can be described from one image. Images should **NOT** be sized up via image editing at all! Please use the concommand `poster X` to take your screenshots (X is a render size multiplier, I typically set it to 2), and size down the screenshot in image editing software.

Alongside each preview should be a .json file containing some details about the map itself. A `?` denotes that a field that is optional and can either be replaced with `null` or not included.
```jsonc
{
    "name": "gm_construct", /** @type {string} The name of the map as it is loaded by the game. */
    "version": 13, /** @type {(string|number)?} A version representation. */
    "sha1": "1e5ee9f598b6e82f290ddc233fad484c1945e186", /** @type {string?} A SHA1 hash of the map; NOT the .gma file the map may have come from, but of the actual .bsp file! */
    "description": "An empty, semi-detailed construction map.", /** @type {string?} A short(ish) description of the map. */
    "authors": [ /** @type {AuthorInfo[]?} A list of authors of the map. */
        {
            "name": "Facepunch",
            "steamid": null,
            "url": "https://gmod.facepunch.com"
        }
    ],
    "steamid": null, /** @type {string?} The workshop ID that represents this map. */
    "gamemode": "sandbox", /** @type {string} The gamemode that this map is intended for. */
    "playercount": 24 /** @type {number?} The intended server player count for this map. */
}

/**
 * @typeof {Object} AuthorInfo
 * @property {string} name - The name of the author.
 * @property {string?} steamid - The SteamID of the author.
 * @property {string?} url - The URL of the author.
 */
```
