# Blood on the Clocktower Plugin
[Blood on the Clocktower Wiki](https://wiki.bloodontheclocktower.com/Main_Page)

## Description
A BetterDiscord plugin designed for the Storyteller of *Blood on the Clocktower*. It automates server setup and provides tools to manage players efficiently during the game.

## Features
- Automatically generates a server setup when a new server is created.
- Creates essential channels:
  - **Town Square** (main discussion area)
  - Various themed voice channels (e.g., Blacksmith, Graveyard, Brothel, etc.)
  - **Great Clocktower** (hidden channel for Storytellers)
  - **Bedrooms** (private voice channels for night phases)
- Adds contextual menu options:
  - **Move Everyone to Bedrooms** (sends players to individual hidden voice channels for the night phase, this also dynamically generates new bedrooms if there aren't enough)
  - **Move to Great Clocktower** (for night interactions, only available on Bedroom channels)
  - **Move all to Town Square** (gathers all users back in the main discussion area)
  - **Mute/Unmute Townsfolk** (server mutes/unmutes all except Storytellers, only available on the Town Square channel)
- Creates a **Storyteller** role with permissions to manage channels, move users, and access hidden areas.
- Automatically moves Storytellers to the Great Clocktower during the night phase.
- Allows for quick user movement:
  - Hold **Shift** or **Control** to select users and drag to highlight them.
  - Right-click any channel and choose **Move X here** to relocate highlighted users instantly.

## Installation
1. Download the plugin file.
2. Place it in the `plugins` folder of BetterDiscord.
3. Enable it in the BetterDiscord settings.

## Usage
1. Create a new server, make sure this is named 'Blood on the Clocktower', right click on the General voice channel, select generate server, and the plugin will prompt to generate the server structure.
2. Use the provided context menu options to manage players efficiently during the game.
3. Utilize the quick-move feature for streamlined player relocation.

## Configuration
No additional configuration required—everything is automated for easy use.

## Known Issues
No Known bugs currently. Please report any bugs to Daddaforce

## Changelog
### v1.0.0
- Initial release

## License
This project is licensed under the MIT License.
