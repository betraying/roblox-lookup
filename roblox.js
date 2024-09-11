// COMMAND HANDLING
client.on('interactionCreate', async interaction => {
    try {
        if (!interaction.isCommand()) return;

        const { commandName, user } = interaction;

        if (commandName === 'roblox' || commandName === 'r') {
            const identifier = interaction.options.getString('identifier');

            // Fetch the Roblox profile based on username or ID
            const profile = await fetchRobloxProfile(identifier);
            if (!profile) {
                await interaction.reply({ content: `No Roblox Profile has been found for: ${identifier}` });
                return;
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setTitle(`${profile.name}`)
                .setURL(`https://www.roblox.com/users/${profile.id}/profile`)
                .setThumbnail(profile.avatar)
                .addFields(
                    { name: 'Bio', value: profile.description || 'No description', inline: false },
                    { name: 'Created', value: `<t:${profile.created}:D>`, inline: true },
                    { name: 'Status', value: profile.status, inline: true },
                    { name: 'Followers', value: profile.followers.toString(), inline: false },
                    { name: 'Following', value: profile.following.toString(), inline: false }
                )
                .setFooter({ text: 'made by @betraying'});

            await interaction.reply({ embeds: [embed] });
        }
    } catch (error) {
        console.error('error handling interaction:', error);
    }
});

// Handle ,r or ,roblox command
client.on('messageCreate', async message => {
    if (message.content.startsWith(',roblox') || message.content.startsWith(',r')) {
        const args = message.content.split(' ');
        const identifier = args.slice(1).join(' ');

        if (!identifier) {
            const embed = new EmbedBuilder()
                .setTitle('Please Provide a Roblox Username or ID')
                .setColor('#FFFFFF');

            await message.channel.send({ embeds: [embed] });
            return;
        }

        const profile = await fetchRobloxProfile(identifier);
        if (!profile) {
            await message.channel.send(`No Roblox profile has been found for: ${identifier}`);
            return;
        }

        // Create embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setTitle(`${profile.name}`)
            .setURL(`https://www.roblox.com/users/${profile.id}/profile`)
            .setThumbnail(profile.avatar)
            .addFields(
                { name: '**Bio**', value: profile.description || 'No description', inline: false },
                { name: '**Created**', value: `<t:${profile.created}:D>`, inline: true },
                { name: '**Status**', value: profile.status, inline: true },
                { name: '**Followers**', value: profile.followers.toString(), inline: false },
                { name: '**Following**', value: profile.following.toString(), inline: false }
            )
            .setFooter({ text: 'made by @betraying'});

        await message.channel.send({ embeds: [embed] });
    }
});

async function fetchRobloxProfile(identifier) {
    try {
        let userId;

        if (isNaN(identifier)) {
            const response = await fetch(`https://users.roblox.com/v1/usernames/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ usernames: [identifier] })
            });

            if (!response.ok) {
                throw new Error(`Error fetching user ID for ${identifier}: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.data || data.data.length === 0) {
                throw new Error(`No Roblox profile found for username: ${identifier}`);
            }

            userId = data.data[0].id; 
        } else {
            userId = identifier;
        }

        const profileResponse = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        if (!profileResponse.ok) {
            throw new Error(`Error fetching profile details for user ID ${userId}: ${profileResponse.status} ${profileResponse.statusText}`);
        }
        const profileData = await profileResponse.json();

        const avatarResponse = await fetch(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`);
        if (!avatarResponse.ok) {
            throw new Error(`Error fetching avatar for user ID ${userId}: ${avatarResponse.status} ${avatarResponse.statusText}`);
        }
        const avatarData = await avatarResponse.json();
        const avatarUrl = avatarData.data[0].imageUrl;

        const followersResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
        if (!followersResponse.ok) {
            throw new Error(`Error fetching followers count for user ID ${userId}: ${followersResponse.status} ${followersResponse.statusText}`);
        }
        const followersData = await followersResponse.json();

        const followingResponse = await fetch(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
        if (!followingResponse.ok) {
            throw new Error(`Error fetching following count for user ID ${userId}: ${followingResponse.status} ${followingResponse.statusText}`);
        }
        const followingData = await followingResponse.json();

        const presenceResponse = await fetch(`https://presence.roblox.com/v1/presence/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIds: [userId] })
        });
        if (!presenceResponse.ok) {
            throw new Error(`Error fetching presence for user ID ${userId}: ${presenceResponse.status} ${presenceResponse.statusText}`);
        }
        const presenceData = await presenceResponse.json();
        const lastOnline = presenceData.userPresences[0]?.lastOnline || 'N/A';
        const status = presenceData.userPresences[0]?.userPresenceType === 0 ? 'Offline' : 'Online';

        const createdTimestamp = Math.floor(new Date(profileData.created).getTime() / 1000);
        const lastOnlineTimestamp = Math.floor(new Date(lastOnline).getTime() / 1000);

        return {
            id: profileData.id,
            name: profileData.name,
            displayName: profileData.displayName,
            description: profileData.description,
            avatar: avatarUrl,
            followers: followersData.count,
            following: followingData.count,
            created: createdTimestamp,
            lastOnline: lastOnlineTimestamp,
            status: status
        };
    } catch (error) {
        return null;
    }
}
