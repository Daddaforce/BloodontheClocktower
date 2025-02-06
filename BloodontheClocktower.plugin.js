/**
 * @name BloodontheClocktower
 * @description A BetterDiscord plugin designed for the Storyteller of *Blood on the Clocktower*. It automates server setup and provides tools to manage players efficiently during the game.
 * @version 1.0.0
 * @author Daddaforce
 * @website https://github.com/Daddaforce
 */
/*@cc_on
@if (@_jscript)
    
    // Offer to self-install for clueless users that try to run this directly.
    var shell = WScript.CreateObject("WScript.Shell");
    var fs = new ActiveXObject("Scripting.FileSystemObject");
    var pathPlugins = shell.ExpandEnvironmentStrings("%APPDATA%\\BetterDiscord\\plugins");
    var pathSelf = WScript.ScriptFullName;
    // Put the user at ease by addressing them in the first person
    shell.Popup("It looks like you've mistakenly tried to run me directly. \n(Don't do that!)", 0, "I'm a plugin for BetterDiscord", 0x30);
    if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
        shell.Popup("I'm in the correct folder already.", 0, "I'm already installed", 0x40);
    } else if (!fs.FolderExists(pathPlugins)) {
        shell.Popup("I can't find the BetterDiscord plugins folder.\nAre you sure it's even installed?", 0, "Can't install myself", 0x10);
    } else if (shell.Popup("Should I copy myself to BetterDiscord's plugins folder for you?", 0, "Do you need some help?", 0x34) === 6) {
        fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
        // Show the user where to put plugins in the future
        shell.Exec("explorer " + pathPlugins);
        shell.Popup("I'm installed!", 0, "Successfully installed", 0x40);
    }
    WScript.Quit();

@else@*/
const config = {
    main: "index.js",
    info: {
        name: "BloodontheClocktower",
        authors: [
            {
                name: "Daddaforce",
                github_username: "Daddaforce"
            }
        ],
        version: "1.0.0",
        description: "A BetterDiscord plugin designed for the Storyteller of *Blood on the Clocktower*. It automates server setup and provides tools to manage players efficiently during the game.",
        github: "https://github.com/Daddaforce"
    },
    changelog: [],
    defaultConfig: [
        {
            type: "textbox",
            id: "moveInterval",
            value: "100",
            name: "Move interval",
            note: "in ms, delay between different actions to prevent being flagged as api abuse."
        }
    ]
};
class Dummy {
    constructor() {this._config = config;}
    start() {}
    stop() {}
}
 
if (!global.ZeresPluginLibrary) {
    BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.name ?? config.info.name} is missing. Please click Download Now to install it.`, {
        confirmText: "Download Now",
        cancelText: "Cancel",
        onConfirm: () => {
            require("request").get("https://betterdiscord.app/gh-redirect?id=9", async (err, resp, body) => {
                if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                if (resp.statusCode === 302) {
                    require("request").get(resp.headers.location, async (error, response, content) => {
                        if (error) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), content, r));
                    });
                }
                else {
                    await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                }
            });
        }
    });
}
 
module.exports = !global.ZeresPluginLibrary ? Dummy : (([Plugin, Api]) => {
    const plugin = (Plugin, Library) => {
    const {
        ReactTools,
        WebpackModules,
        PluginUtilities,
        DiscordModules,
        Patcher,
        Toasts
    } = Api;
    const VoiceStatesStore = WebpackModules.getByProps("getVoiceStates");
    const VoiceUserSelector = BdApi.findModuleByProps("voiceUser").voiceUser;
    const VoiceUsersRender = WebpackModules.getByPrototypes("renderPrioritySpeaker");
    const GuildChannelStore = WebpackModules.getByProps("getVocalChannelIds");
    const SetMemberChannel = BdApi.findModuleByProps("setChannel");
    const CreateChannelActions = BdApi.Webpack.getModule(m => m.createChannel);
    const UpdateChannelActions = BdApi.Webpack.getModule(m => m.updateChannel);
    const UpdatePermissionOverwriteActions = BdApi.Webpack.getModule(m => m.updatePermissionOverwrite);
    const GuildUserStore = BdApi.Webpack.getModule(m => m.getMembers);
    const GuildRolesStore = BdApi.Webpack.getModule(m => m.getRoles);
    const GuildRoleActions = BdApi.Webpack.getModule(m => m.createRole);
    const MutableChannelsForGuild = BdApi.Webpack.getModule(m => m.getMutableGuildChannelsForGuild)
    const CreateMessageActions = BdApi.Webpack.getModule(m => m.sendMessage);
    const UserStore = BdApi.Webpack.getModule(m => m.getCurrentUser);
    const ChannelPermissionStore = BdApi.Webpack.getModule(m => m.getChannelPermissions);
    const GuildCategories = BdApi.Webpack.getModule(m => m.getCategories);

    const fs = require('fs');
    const path = require('path');

    const ServerName = "Blood on the Clocktower"
    const StorytellerRole = "Storyteller"
    const StorytellerRoleColor = 0x2bc410
    const ClockTowerChannelName = "Great Clocktower"
    const TownSquareChannelName = "Town Square"
    const BedroomName = "Bedroom"
    const PluginInformationChannel = "plugin-information"

    class RoomInfo {
        constructor({name, type, permissions=false, children=[]} = {}) {
            this.name = name;
            this.type = type;
            this.permissions = permissions;
            this.children = children;
        }
    }

    const InformationTextChannelNames = new RoomInfo(
        {
            name: "Information", type: 4, children: [
                new RoomInfo({name: PluginInformationChannel, type: 0}),
                new RoomInfo({name: "town-square", type: 0}),
            ]
        }
    )
    const VoiceChannelNames = new RoomInfo(
        {
            name: "The Clocktower District", type: 4, children: [
                new RoomInfo({name: TownSquareChannelName, type: 2}),
                new RoomInfo({name: ClockTowerChannelName, type: 2, permissions: true}),
                new RoomInfo({name: "Potion Shop", type: 2}),
                new RoomInfo({name: "Blacksmiths", type: 2}),
                new RoomInfo({name: "The Tavern", type: 2}),
                new RoomInfo({name: "Old Abbey", type: 2}),
                new RoomInfo({name: "Guild Hall", type: 2}),
                new RoomInfo({name: "Graveyard", type: 2}),
                new RoomInfo({name: "Brothel", type: 2}),
            ]
        }
    )

    class BloodontheClocktower extends Plugin {
        cancelled = false;
        guild_id = "";
        selectedUsers = new Set();
        mouseHeld = false;
        modifierAddMode = true;
        mouseStart = {x:0, y:0};
        storytellerRoleId = undefined;
        voiceChannelCategoryId = undefined;
        townsfolkMuted = false;
        maxRetries = 5;

        constructor() {
            super();
        }

        getSettingsPanel() {
            const panel = this.buildSettingsPanel();
            panel.addListener(() => {
                //this.forceUpdateAll();
            });
            return panel.getElement();
        }

        async onStart() {
            this.triggerREADME();
            this.cancelled = false;
            PluginUtilities.addStyle(config.info.name, this.css);
            this.PatchAll();
        }

        addDocumentListenerEvent(event, callback) {
            let unpatch = () => {
                document.removeEventListener(event, callback);
            };
            document.addEventListener(event, callback);
            return unpatch;
        }

        async PatchAll() {
            this.contextMenuPatches.push(BdApi.ContextMenu.patch("channel-context", this.channelMenuPatch.bind(this)));
            Patcher.after(VoiceUsersRender.prototype, "render", this.voiceUserRenderPatch.bind(this));
            this.contextMenuPatches.push(this.addDocumentListenerEvent("mousedown", this.onMouseDown.bind(this)));
            this.contextMenuPatches.push(this.addDocumentListenerEvent("mousemove", this.onMouseMove.bind(this)));
            this.contextMenuPatches.push(this.addDocumentListenerEvent("mouseup", this.onMouseUp.bind(this)));
            return;
        }

        onStop() {
            this.cancelled = true;
            PluginUtilities.removeStyle(config.info.name);
            Patcher.unpatchAll();

            for (let unpatch of this.contextMenuPatches) {
                try {
                    unpatch();
                } catch (e) {
                    //Do nothing
                }
            }
        }

        onMouseDown(e) {
            if ((e.button == 0 || e.button == 2) && (e.shiftKey || e.ctrlKey)){
                this.mouseHeld = true;
                this.modifierAddMode = e.button == 0;
                this.mouseStart = {x: e.x, y: e.y};

                e.stopImmediatePropagation();
                e.stopPropagation();
                e.preventDefault();
            }
        }

        onMouseUp(e) {
            if (this.mouseHeld && (e.button == 0 || e.button == 2)){
                this.mouseHeld = false;

                e.stopImmediatePropagation();
                e.stopPropagation();
                e.preventDefault();

                let voiceElements = document.querySelectorAll(".dragSelectedVoiceUser");

                for (const element of voiceElements) {
                    element.classList.toggle("dragSelectedVoiceUser", false);

                    let user = ReactTools.getOwnerInstance(element.parentElement).props.user;
                    if (user && user.id) {
                        element.classList.toggle("selectedVoiceUser", this.modifierAddMode);
                        if (this.modifierAddMode) {
                            this.selectedUsers.add(user.id);
                        } else {
                            this.selectedUsers.delete(user.id);
                        }
                    }
                }
            }
        }

        onMouseMove(e) {
            if (this.mouseHeld && (e.shiftKey || e.ctrlKey)) {
                let top = Math.min(e.y, this.mouseStart.y);
                let left = Math.min(e.x, this.mouseStart.x);
                let right = Math.max(e.x, this.mouseStart.x);
                let bottom = Math.max(e.y, this.mouseStart.y);

                let voiceElements = document.querySelectorAll("." + VoiceUserSelector);

                for (const element of voiceElements) {
                    let rect = element.getBoundingClientRect();
                    // check if this rectangle collides with the selection area
                    let collided = !(rect.left > right || rect.right < left || rect.top > bottom || rect.bottom < top)
                    element.classList.toggle("dragSelectedVoiceUser", collided);
                }

                e.stopImmediatePropagation();
                e.stopPropagation();
                e.preventDefault();
            } else {
                this.mouseHeld = false;
            }
        }

        channelMenuPatch(retVal, props) {

            if (props.channel.type !== 2) return;

            if (props.guild.id !=  this.guild_id) {
                this.guild_id = props.guild.id;
                this.selectedUsers.clear();
            }

            if (!this.canMoveInChannel(props.channel.id) || props.guild.name !== ServerName) {
                return;
            };

            // Cooldown system
            if (!this.actionCooldown) {
                this.actionCooldown = new Set();
            }

            const runOnce = (key, func) => {
                if (this.actionCooldown.has(key)) return;
                this.actionCooldown.add(key);
                func();
                setTimeout(() => this.actionCooldown.delete(key), 500); // 500ms cooldown
            };

            const postReadMe = BdApi.ContextMenu.buildItem({
                label: `Post README`,
                action: () => runOnce("postReadMe", () => {
                    this.addPluginInformation(props.guild, "README.md");
                    this.selectedUsers.clear();
                })
            });

            const getREADME = BdApi.ContextMenu.buildItem({
                label: `Download README File`,
                action: () => runOnce("getREADME", () => {
                    this.getREADMEFile();
                    this.selectedUsers.clear();
                })
            });

            const moveToBedrooms = BdApi.ContextMenu.buildItem({
                label: `Move ${this.selectedUsers.size > 0 ? this.selectedUsers.size : 'Everyone'} to Bedrooms`,
                action: () => runOnce("moveToBedrooms", () => {
                    this.moveUsersToBedrooms(props.guild, props.channel);
                    this.selectedUsers.clear();
                })
            });

            const createStorytellerRole = BdApi.ContextMenu.buildItem({
                label: "Create Storyteller Role",
                action: () => runOnce("createStorytellerRole", () => {
                    this.createGuildStorytellerRole(props.guild);
                    this.selectedUsers.clear();
                })
            });

            const moveToTownSquare = BdApi.ContextMenu.buildItem({
                label: "Move Everyone to Town Square",
                action: () => runOnce("moveToTownSquare", () => {
                    this.moveUsersToTownSquare(props.guild);
                    this.selectedUsers.clear();
                })
            });

            const moveToClockTower = BdApi.ContextMenu.buildItem({
                label: `Move to Clocktower`,
                action: () => runOnce("moveToClockTower", () => {
                    this.moveToClockTower(props.guild, props.channel);
                    this.selectedUsers.clear();
                })
            });

            const muteUsers = BdApi.ContextMenu.buildItem({
                label: `${this.townsfolkMuted ? 'Unmute' : 'Mute'} Townsfolk`,
                action: () => runOnce("muteUsers", () => {
                    this.muteTownsfolk(props.guild);
                    this.selectedUsers.clear();
                })
            });

            const regenerateServerChannels = BdApi.ContextMenu.buildItem({
                label: `Generate Server for Blood on the Clocktower`,
                action: () => runOnce("regenerateServerChannels", () => {
                    this.regenerateServerConfirm(props.guild);
                    this.selectedUsers.clear();
                })
            });
            
            const moveToChannel = BdApi.ContextMenu.buildItem({
                label: `Move ${this.selectedUsers.size} here`,
                action: () => runOnce("moveToChannel", () => {
                    this.moveSelectedUsers(props.guild, props.channel.id);
                    this.selectedUsers.clear();
                })
            });

            let separatorAdded = false
            const storytellerRoleExists = this.checkForStoryTeller(props.guild)
            const readMeExists = this.checkREADME()
            let canGenerateServer = this.checkToGenerateServer(props.guild) && this.canManageGuild(props.channel.id);
            if (!readMeExists) {
                separatorAdded = this.addContextItem(retVal, getREADME, separatorAdded);
            } else if (canGenerateServer) {
                separatorAdded = this.addContextItem(retVal, regenerateServerChannels, separatorAdded);
            } else if (!storytellerRoleExists) {
                separatorAdded = this.addContextItem(retVal, createStorytellerRole, separatorAdded);
            } else {
                if (props.channel.name === TownSquareChannelName) {
                    separatorAdded = this.addContextItem(retVal, muteUsers, false);
                    separatorAdded = this.addContextItem(retVal, moveToTownSquare, false);
                };
                const channelUsers = this.getVoices(props.guild, props.channel)
                if (props.channel.name === BedroomName && channelUsers.length > 0) {
                    separatorAdded = this.addContextItem(retVal, moveToClockTower, separatorAdded);
                };
                if (props.channel.name === TownSquareChannelName || props.channel.name === ClockTowerChannelName) {
                    separatorAdded = this.addContextItem(retVal, moveToBedrooms, separatorAdded);
                };
                if (this.selectedUsers.size > 0) {
                    this.addContextItem(retVal, moveToChannel, false);
                };
            }
            return retVal;
        }

        checkREADME() {
            const readmePath = path.join(BdApi.Plugins.folder, "README.md");
            if (fs.existsSync(readmePath)) return true;
            return false;
        }

        async getREADMEFile() {
            await this.triggerREADME();
        }

        async triggerREADME() {
            const readmePath = path.join(BdApi.Plugins.folder, "README.md");

            if (fs.existsSync(readmePath)) return true;

            BdApi.showConfirmationModal("README Missing", `The README file needed for ${config.name ?? config.info.name} is missing. Please click Download Now to aquire it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://raw.githubusercontent.com/Daddaforce/BloodontheClocktower/refs/heads/main/README.md", async (err, resp, body) => {
                        await new Promise(r => fs.writeFile(path.join(BdApi.Plugins.folder, "README.md"), body, r));
                    });
                }
            });
        }

        regenerateServerConfirm(guild) {
            BdApi.showConfirmationModal("Regenerate Server", `This server will be regenerated into a Blood on the Clocktower server.`, {
                confirmText: "Let's go!",
                cancelText: "Cancel",
                onConfirm: () => {
                    this.regenerateServer(guild)
                }
            })
        }

        async regenerateServer(guild) {
            Toasts.info("Regenerating server!")

            // Delete all current channels
            const guildChannels = Object.values(MutableChannelsForGuild.getMutableGuildChannelsForGuild(guild.id));
            let channelIds = []
            const wait = this.getAPICallDelay();
            guildChannels.forEach((channel, _) => {
                channelIds.push(channel.id)
            })
            for (let i = 0; i < channelIds.length; i++) {
                await UpdateChannelActions.deleteChannel(channelIds[i])
                await this.sleep(wait);
            }

            // Create Storyteller Role
            await this.createGuildStorytellerRole(guild);

            // Generate all required channels
            await this.createRooms({guild: guild, roomInfo: InformationTextChannelNames})
            await this.createRooms({guild: guild, roomInfo: VoiceChannelNames})

            // Post README
            Toasts.info(`Updating ${PluginInformationChannel} channel with the README.`)
            await this.addPluginInformation(guild, "README.md");
        }

        async addPluginInformation(guild, fileName) {
            const guildChannels = Object.values(MutableChannelsForGuild.getMutableGuildChannelsForGuild(guild.id));
            let pluginInformationChannelId = undefined;
            guildChannels.forEach((channel, _) => {
                if (channel.name === PluginInformationChannel && channel.type === 0) {
                    pluginInformationChannelId = channel.id;
                }
            })
            if (pluginInformationChannelId !== undefined) {
                let messageContent = ""
                const filePath = path.join(__dirname, fileName);
                fs.readFile(filePath, 'utf-8', async (err, data) => {
                    if (err) {
                        Toasts.error("Error reading Markdown file:", err);
                        return;
                    }
                    messageContent = data;
                })
                const headerRegex = /^(#{1,6})\s*(.*?)\n([\s\S]*?)(?=\n#{1,6}|\n*$)/gm;
                let match;
                let headerIndexes = []
                while ((match = headerRegex.exec(messageContent)) !== null) {
                    headerIndexes.push(match.index);
                }
                for (let i = 0; i < headerIndexes.length; i++) {
                    let message = ""
                    if (headerIndexes.length - 1 === i) {
                        message = messageContent.slice(headerIndexes[i]).trim()
                    } else {
                        message = messageContent.slice(headerIndexes[i], headerIndexes[i+1]).trim()
                    }
                    await this.sendMessagePost(pluginInformationChannelId, message)
                }
            }
        }

        async muteTownsfolk(guild) {
            const wait = this.getAPICallDelay();
            let userIdsToMute = [];
            const voices = this.getVoices(guild);
            if (voices.length === 0) return;
            voices.forEach((voice, _) => {
                const roles = Object.values(voice.member.roles)
                let isAStoryTeller = false;
                roles.forEach((roleId, _) => {
                    if (roleId === this.storytellerRoleId) {
                        isAStoryTeller = true;
                    }
                });
                if (!isAStoryTeller) {
                    userIdsToMute.push(voice.user.id);
                }
            });
            Toasts.info(`${!this.townsfolkMuted ? 'Muting' : 'Unmuting'} ${userIdsToMute.length} users`);
            for (let i = 0; i < userIdsToMute.length; i++) {
                await this.muteUsersPost(guild.id, userIdsToMute[i], !this.townsfolkMuted);
            }
            this.townsfolkMuted = !this.townsfolkMuted
            // Toasts.info("Muting complete");
        }

        getAPICallDelay() {
            let wait = 100;
            if (!isNaN(this.settings.moveInterval) && this.settings.moveInterval > 50) {
                wait = Number(this.settings.moveInterval);
            }
            return wait
        }

        checkToGenerateServer(guild) {
            const guildChannels = Object.values(MutableChannelsForGuild.getMutableGuildChannelsForGuild(guild.id));
            let generalVoiceExists = false;
            let generalTextExists = false;
            guildChannels.forEach((channel, _) => {
                if (channel.name === 'General' && channel.type === 2) {
                    generalVoiceExists = true;
                } else if (channel.name === 'general' && channel.type === 0) {
                    generalTextExists = true;
                } else if (channel.type === 2 || channel.type === 0) {
                    return false;
                }
            })
            return generalVoiceExists && generalTextExists;
        }

        checkForStoryTeller(guild) {
            const guildRoles = Object.values(GuildRolesStore.getRoles(guild.id));
            let storytellerRoleExists = false
            guildRoles.forEach((role, _) => {
                if (role.name === StorytellerRole && role.color === StorytellerRoleColor) {
                    this.storytellerRoleId = role.id;
                    storytellerRoleExists = true;
                }
            })
            return storytellerRoleExists
        }

        addContextItem(retVal, contextItem, separatorAdded) {
            const separator = BdApi.ContextMenu.buildItem({
                type: "separator"
            });
            if (!separatorAdded) {
                retVal.props.children.push(separator);
                separatorAdded = true;
            }
            retVal.props.children.push(contextItem);
            return separatorAdded
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        async createGuildStorytellerRole(guild) {
            // Create Storyteller Role
            const wait = this.getAPICallDelay();
            const combinedPermissions = (
                DiscordModules.DiscordPermissions.MANAGE_CHANNELS |
                DiscordModules.DiscordPermissions.VIEW_CHANNEL |
                DiscordModules.DiscordPermissions.MOVE_MEMBERS |
                DiscordModules.DiscordPermissions.MUTE_MEMBERS
            );

            const roleData = {
                guildId: guild.id,
                name: StorytellerRole,
                permissions: combinedPermissions,
                color: StorytellerRoleColor,
            };

            // Toasts.info(`Creating Storyteller Role`);
            const newStorytellerRole = await GuildRoleActions.createRole(
                roleData.guildId,
                roleData.name,
                roleData.color
            ).catch(err => {
                Toasts.error("Failed to create Storyteller role:", err);
            });
            await this.sleep(wait);
            await GuildRoleActions.updateRolePermissions(
                roleData.guildId,
                newStorytellerRole.id,
                roleData.permissions,
            ).catch(err => {
                Toasts.error("Failed to update Storyteller role:", err);
            });
            this.storytellerRoleId = newStorytellerRole.id

            // Find and assign storyteller role to existing bedrooms and clocktower
            const guildChannels = Object.values(GuildChannelStore.getVocalChannelIds(guild.id));
            let privateChannels = []
            guildChannels.forEach((channelId, _) => {
                let channel = DiscordModules.ChannelStore.getChannel(channelId);
                if (
                    channel.name === BedroomName ||
                    channel.name === ClockTowerChannelName
                ) {
                    privateChannels.push(channel);
                }
            });
            // Define the permissions you want to add
            const permissions = (
                DiscordModules.DiscordPermissions.VIEW_CHANNEL |
                DiscordModules.DiscordPermissions.CONNECT |
                DiscordModules.DiscordPermissions.SPEAK
            );
            for (let i = 0; i < privateChannels.length; i++) {
                // Add a new permission overwrite for the role
                const overwrite = {
                    id: newStorytellerRole.id,  // The role ID
                    type: 0,                   // Type 0 means this is for a role, not a user
                    allow: permissions, // Permissions to allow
                    deny: DiscordModules.DiscordPermissions.DENY_PERMISSIONS   // Permissions to deny
                };
                // Update the channel with the new overwrites
                try {
                    await UpdatePermissionOverwriteActions.updatePermissionOverwrite(privateChannels[i].id, overwrite);
                    await this.sleep(wait);
                } catch (err) {
                    Toasts.error("Failed to update channels with Storyteller role:", err);
                }
            }
            // Toasts.info(`Successfully created Storyteller Role`);
        }

        generatePermissionOverwrites(guild) {
            const permissions = (
                DiscordModules.DiscordPermissions.VIEW_CHANNEL |
                DiscordModules.DiscordPermissions.CONNECT
            );

            const permissionOverwrites = [ 
                {
                    id: guild.id, // @everyone role is always the guild ID
                    type: 0, // 0 = Role, 1 = User
                    deny: permissions, // 1024 = VIEW_CHANNEL
                    allow: 0
                }
            ];
            if (this.storytellerRoleId !== undefined) {
                const storytellerPermissions = (
                    DiscordModules.DiscordPermissions.VIEW_CHANNEL |
                    DiscordModules.DiscordPermissions.CONNECT |
                    DiscordModules.DiscordPermissions.SPEAK
                );
                permissionOverwrites.push({
                    id: this.storytellerRoleId,  // The role ID
                    type: 0,                   // Type 0 means this is for a role, not a user
                    allow: storytellerPermissions, // Permissions to allow
                    deny: DiscordModules.DiscordPermissions.DENY_PERMISSIONS   // Permissions to deny
                });
            }
            return permissionOverwrites
        }

        async createRooms({guild, roomInfo, parentId=null, roomsToCreate=1}) {
            if (!(roomInfo instanceof RoomInfo)) {
                Toasts.error(`RoomInfo is not of type RoomInfo`);
                return;
            }
            // Create rooms
            let newRoomIds = []
            if (roomInfo.children.length > 0) {
                const parentRoom = this.generateRoomModel(guild, roomInfo, parentId);
                let parentRoomIds = await this.createChannels(parentRoom, roomsToCreate);
                newRoomIds = [...newRoomIds, ...parentRoomIds];
                let parentRoomId = parentRoomIds[0]
                for (let i = 0; i < roomInfo.children.length; i++) {
                    const newRoom = this.generateRoomModel(guild, roomInfo.children[i], parentRoomId);
                    let roomIds = await this.createChannels(newRoom, roomsToCreate);
                    newRoomIds = [...newRoomIds, ...roomIds];
                }
            } else {
                const newRoom = this.generateRoomModel(guild, roomInfo, parentId);
                newRoomIds = await this.createChannels(newRoom, roomsToCreate);
            }
            return newRoomIds;
        }

        generateRoomModel(guild, roomInfo, parentId=null) {
            const permissionOverwrites = roomInfo.permissions ? this.generatePermissionOverwrites(guild) : [];
            let newRoom = {
                guildId: guild.id,
                name: roomInfo.name,
                type: roomInfo.type,
                permissionOverwrites: permissionOverwrites, // Optional: Array of permission overwrites
                parentId: parentId
            };

            if (roomInfo.type === 2) {
                newRoom.bitrate = 64000;
                newRoom.userLimit = 0;
            }
            return newRoom;
        }

        async createChannels(newRoom, roomsToCreate) {
            let newRoomIds = []
            Toasts.info(`Creating ${roomsToCreate} ${newRoom.name}`);
            for (let i = 0; i < roomsToCreate; i++) {
                const newRoomdId = await this.createChannelPost(newRoom)
                newRoomIds.push(newRoomdId);
            }
            // Toasts.info(`Successfully created ${roomsToCreate} ${newRoom.name}`);
            return newRoomIds;
        }

        async sendMessagePost(channelId, content) {
            const wait = this.getAPICallDelay();
            let attempts = 0;
            const messageData = {
                content: content,
            }
            while (attempts < this.maxRetries) {
                try {
                    await CreateMessageActions.sendMessage(channelId, messageData);
                    await this.sleep(wait);
                    break;
                } catch (error) {
                    if (error.status === 429) {
                        const retryAfter = error.headers?.["retry-after"] || 1; // Default to 1s if not found
                        Toasts.warn(`Rate limited! Retrying in ${retryAfter} seconds...`);
                        await this.sleep(retryAfter * 1000); // Wait
                    } else {
                        console.log(error);
                        break;
                    }
                }
            }
        }

        async muteUsersPost(guildId, userId, muted) {
            const wait = this.getAPICallDelay();
            let attempts = 0;
            while (attempts < this.maxRetries) {
                try {
                    await GuildRoleActions.setServerMute(guildId, userId, muted);
                    await this.sleep(wait);
                    break;
                } catch (error) {
                    if (error.status === 429) {
                        const retryAfter = error.headers?.["retry-after"] || 1; // Default to 1s if not found
                        Toasts.warn(`Rate limited! Retrying in ${retryAfter} seconds...`);
                        await this.sleep(retryAfter * 1000); // Wait
                    } else {
                        console.log(error);
                        break;
                    }
                }
            }
        }

        async moveUsersPost(guildId, userId, roomId) {
            const wait = this.getAPICallDelay();
            let attempts = 0;
            while (attempts < this.maxRetries) {
                try {
                    await SetMemberChannel.setChannel(guildId, userId, roomId);
                    await this.sleep(wait);
                    break;
                } catch (error) {
                    if (error.status === 429) {
                        const retryAfter = error.headers?.["retry-after"] || 1; // Default to 1s if not found
                        Toasts.warn(`Rate limited! Retrying in ${retryAfter} seconds...`);
                        await this.sleep(retryAfter * 1000); // Wait
                    } else {
                        console.log(error);
                        break;
                    }
                }
            }
        }

        async createChannelPost(newRoom) {
            const wait = this.getAPICallDelay();
            let newChannelId = undefined;
            let attempts = 0;
            while (attempts < this.maxRetries) {
                try {
                    const newChannel = await CreateChannelActions.createChannel(newRoom);
                    newChannelId = newChannel.body.id
                    await this.sleep(wait);
                    break;
                } catch (error) {
                    if (error.status === 429) {
                        const retryAfter = error.headers?.["retry-after"] || 1; // Default to 1s if not found
                        Toasts.warn(`Rate limited! Retrying in ${retryAfter} seconds...`);
                        await this.sleep(retryAfter * 1000); // Wait
                    } else {
                        console.log(error);
                        break;
                    }
                }
            }
            return newChannelId;
        }

        async moveSelectedUsers(guild, channelId) {
            const wait = this.getAPICallDelay();
            let users = Array.from(this.selectedUsers);
            Toasts.info('Moving ' + users.length + " users");
            for (let i = 0; i < users.length; i++) {
                await this.moveUsersPost(guild.id, users[i], channelId);
            }
            Toasts.info("Moving complete");
        }

        async moveUsersToBedrooms(guild, channel) {
            const wait = this.getAPICallDelay();
            let unknownUserIds = []
            if (this.selectedUsers.size === 0) {
                const voices = this.getVoices(guild)
                if (voices.length === 0) return;
                voices.forEach((voice, _) => {
                    unknownUserIds.push(voice.user.id)
                });
            } else {
                unknownUserIds = Array.from(this.selectedUsers);
            }
            let storytellerUsers = []
            let users = []
            const guildUsers = Object.values(GuildUserStore.getMembers(guild.id))
            guildUsers.forEach((user, _) => {
                unknownUserIds.forEach((unknownUserId, _) => {
                    if (unknownUserId === user.userId) {
                        const roles = Object.values(user.roles)
                        let userAdded = false;
                        roles.forEach((roleId, _) => {
                            if (roleId === this.storytellerRoleId) {
                                storytellerUsers.push(user.userId);
                                userAdded = true;
                            }
                        });
                        if (!userAdded) {
                            users.push(user.userId);
                        }
                    }
                });
            });

            let bedrooms = [];
            let clocktowerId = undefined;
            let voiceChannelCategoryId = undefined;
            const guildChannels = Object.values(MutableChannelsForGuild.getMutableGuildChannelsForGuild(guild.id));
            guildChannels.forEach((channel, _) => {
                if (channel.name === BedroomName && channel.type === 2) {
                    bedrooms.push(channel);
                } else if (channel.name === ClockTowerChannelName && channel.type === 2) {
                    clocktowerId = channel.id;
                } else if (channel.name === VoiceChannelNames.name && channel.type === 4) {
                    voiceChannelCategoryId = channel.id;
                }
            });
            
            if (voiceChannelCategoryId === undefined) {
                BdApi.alert("Error", `'${VoiceChannelNames.name}' Category Missing.`);
                return;
            }

            let voicesInRooms = [];
            const voiceStates = Object.values(VoiceStatesStore.getVoiceStates(guild.id))
            voiceStates.forEach((voiceState, _) => {
                voiceState.forEach((voice, _) => {
                    voicesInRooms.push(voice);
                })
            })

            let nonOccupiedBedroomIds = [];
            bedrooms.forEach((bedroom, _) => {
                let occupied = false
                voicesInRooms.forEach((voice, _) => {
                    if (bedroom.id === voice.voiceState.channelId && !occupied) {
                        occupied = true;
                        users = users.filter(userId => userId !== voice.user.id);
                    }
                    if (voice.voiceState.channelId === clocktowerId) {
                        storytellerUsers = storytellerUsers.filter(userId => userId !== voice.user.id);
                    }
                })
                if (!occupied) {
                    nonOccupiedBedroomIds.push(bedroom.id);
                };
            })

            let newBedroomIds = [];
            const canCreateChannels = this.canManageChannels(channel.id);
            if (users.length > nonOccupiedBedroomIds.length && canCreateChannels) {
                Toasts.info("Not enough bedrooms, making new bedrooms");
                const missingBedroomCount = users.length - nonOccupiedBedroomIds.length;
                let roomInfo = new RoomInfo({name: BedroomName, type: 2, permissions: true})
                newBedroomIds = await this.createRooms({guild: guild, roomInfo: roomInfo, parentId: voiceChannelCategoryId, roomsToCreate: missingBedroomCount});
            }

            let availableBedroomIds = [...nonOccupiedBedroomIds, ...newBedroomIds];

            if (users.length <= availableBedroomIds.length) {
                if (users.length !== 0) {
                    Toasts.info('Moving ' + users.length + " users to bedrooms.");
                    for (let i = 0; i < users.length; i++) {
                        await this.moveUsersPost(guild.id, users[i], availableBedroomIds[i]);
                    }
                    // Toasts.info("Moving to bedrooms complete!");
                }
                if (storytellerUsers.length !== 0) {
                    Toasts.info('Moving ' + storytellerUsers.length + " users to Clocktower.");
                    for (let i = 0; i < storytellerUsers.length; i++) {
                        await this.moveUsersPost(guild.id, storytellerUsers[i], clocktowerId);
                    }
                    // Toasts.info("Moving to Clocktower complete!");
                }
                if (users.length === 0 && storytellerUsers.length === 0) {
                    Toasts.info("Everyone has already been moved");
                }
            } else {
                BdApi.alert("Error", "Not enough bedrooms.");
            }
        }
    
        async moveUsersToTownSquare(guild) {
            const wait = this.getAPICallDelay();
            const voices = this.getVoices(guild)
            if (voices.length === 0) return;
            let townSquare = undefined
            const guildChannels = Object.values(GuildChannelStore.getVocalChannelIds(guild.id));
            guildChannels.forEach((channelId, _) => {
                let channel = DiscordModules.ChannelStore.getChannel(channelId);
                if (channel.name === TownSquareChannelName) {
                    townSquare = channel;
                };
            })
            
            let users = []
            voices.forEach((voice, _) => {
                if (voice.voiceState.channelId !== townSquare.id) {
                    users.push(voice.user)
                }
            })
            if (users.length === 0) {
                Toasts.info("Everyone is already in the Town Square!");
                return;
            }

            Toasts.info('Moving ' + users.length + " users to Town Square.");
            for (let i = 0; i < users.length; i++) {
                await this.moveUsersPost(guild.id, users[i].id, townSquare.id);
            }
            // Toasts.info("Moving to Town Square complete!");
        }

        getVoices(guild, channel=undefined) {
            let voices = []
            const voiceStates = Object.values(VoiceStatesStore.getVoiceStates(guild.id))
            voiceStates.forEach((voiceState, _) => {
                voiceState.forEach((voice, _) => {
                    if (channel !== undefined && voice.voiceState.channelId === channel?.id) {
                        voices.push(voice);
                    } else if (channel === undefined) {
                        voices.push(voice);
                    }
                })
            })
            return voices;
        }

        async moveToClockTower(guild, channel) {
            const wait = this.getAPICallDelay();
            const voices = this.getVoices(guild, channel)
            if (voices.length === 0) return;
            let users = []
            voices.forEach((voice, _) => { users.push(voice.user)})

            let clockTower = undefined
            const guildChannels = Object.values(GuildChannelStore.getVocalChannelIds(guild.id));
            guildChannels.forEach((channelId, _) => {
                let channel = DiscordModules.ChannelStore.getChannel(channelId);
                if (channel.name === ClockTowerChannelName) {
                    clockTower = channel;
                };
            })
            
            Toasts.info(`Moving ${users.length} user${users.length > 0 ? 's' : ''} to ClockTower.`);
            
            for (let i = 0; i < users.length; i++) {
                await this.moveUsersPost(guild.id, users[i].id, clockTower.id);
            }
            // Toasts.info("Moving to Clocktower complete!");
        }

        voiceUserRenderPatch(org, args, resp) {
            let oldfunc = resp.props.onClick;
            resp.props.onClick = (e) => {
                if (e.ctrlKey || e.shiftKey) {
                    if (org.props.guildId != this.guild_id) {
                        this.guild_id = org.props.guildId;
                        this.selectedUsers.clear();
                    }

                    if (this.selectedUsers.has(org.props.user.id)) {
                        this.selectedUsers.delete(org.props.user.id);
                    } else {
                        this.selectedUsers.add(org.props.user.id);
                    }

                    let current = e.target;
                    while (current != undefined && current.classList) {
                        if (current.classList.contains(VoiceUserSelector)) {
                            current.classList.toggle('selectedVoiceUser', this.selectedUsers.has(org.props.user.id))
                            break;
                        }
                        current = current.parentNode;
                    }
                } else {
                    oldfunc(e);
                }
            };

            resp.props.onClick = resp.props.onClick.bind(this);
            if (this.selectedUsers.has(org.props.user.id)) {
                resp.props.className += " selectedVoiceUser";
            }
        }

        canMoveInChannel(channelId) {
            let channel = DiscordModules.ChannelStore.getChannel(channelId);
            if (!channel.guild_id) return false;
            return DiscordModules.Permissions.can(DiscordModules.DiscordPermissions.MOVE_MEMBERS, channel);
        }

        canManageChannels(channelId) {
            let channel = DiscordModules.ChannelStore.getChannel(channelId);
            if (!channel.guild_id) return false;
            return DiscordModules.Permissions.can(DiscordModules.DiscordPermissions.MANAGE_CHANNELS, channel);
        }

        canManageGuild(channelId) {
            let channel = DiscordModules.ChannelStore.getChannel(channelId);
            if (!channel.guild_id) return false;
            return DiscordModules.Permissions.can(DiscordModules.DiscordPermissions.MANAGE_GUILD, channel);
        }

        contextMenuPatches = [];

        css = `
          .dragSelectedVoiceUser>div {
            background-color: #0099ff87 !important;
            border-radius: 5px;
          }

          .selectedVoiceUser>div {
            background-color: #005fff87;
            border-radius: 5px;
          }
          
          .selectedVoiceUser>div:hover{
            background-color: #04a7ff87 !important;
          }
          `
    }
    return BloodontheClocktower;
};
     return plugin(Plugin, Api);
})(global.ZeresPluginLibrary.buildPlugin(config));
/*@end@*/