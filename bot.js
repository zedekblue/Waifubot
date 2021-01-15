//setting up
const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const users = require('./users.json');
const owner = require('./owner.json')
const request = require('request');
const async = require("async");
const fs = require('fs');

//commands
var prefix = '.';
var beginPosting = 'mc';
var beginMaint = 'mts';
var endMaint = 'mte'
var helpCommand = 'halp';
var setRestrictedChannel = 'setchan';
var beginPostingEdit = 'emc';

//global variables
var keepLooping = true;
var maintOrKill = false;
var maintDetails = '';
var maintReason = '';

//login
client.login(auth.token);
client.once('ready', () => {
	console.log('Bot Online');
});

//listen for messages
client.on('message', message => {



	//verifies a command was used by real user
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	//https://stackoverflow.com/questions/10679580/javascript-search-inside-a-json-object
	//checks if the user is in the restricted channel
	for (var i=0 ; i < users.list.length ; i++) {
		if (users.list[i]['serverID'] == message.guild.id) {
			if (users.list[i]['channelID'] != message.channel.id && users.list[i]['channelID'] != 0) return;
		}
	}
	
	//trims off the arguments of the message
	const args = message.content.slice(prefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();










	//Command to post the embed & begin updating it
	if (command === beginPosting) {
		
		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(`Syntax: **${prefix}${beginPosting}** <server> <optional channel>`);
		} 
		//message.channel.send(`Command name: ${command}\nArguments: ${args}`);

		//verifies the argument is a valid URL
		if (!validURL(args[0])) {
			return message.channel.send(`Syntax: **${prefix}${beginPosting}** <server> <optional channel>\n**Please provide a valid server URL**`);
		} 

		//posts the embed, then initializes the edit sequence
		const embed = new Discord.MessageEmbed()
		.setTitle('Loading...')
		.setColor(0xFF0000)
		.setDescription('Loading...');

		//changes post destination if specified
		if (!args[1]) {
			channelToPost = message.channel.id;
		} else {
			const matches = args[1].match(/^<#!?(\d+)>$/);
			channelToPost = matches[1];
		}

		//posts
		message.guild.channels.cache.get(channelToPost).send(embed).then(embd=>{

			//saves discord embed id
			embdID = embd.id; 
			console.log(`Embed posted in channel \'${embd.channel.name}\' on server \'${embd.guild.name}\'`);
			//keepLooping = true;

			//variables needed to parse/update
			var url = 'https://api.mcsrvstat.us/2/' + args[0];
			var {title,desc,status,onlinePlayers} = '';
			var fails = 0;
			var loops = 0;
			
			
			//loop until message is deleted
			//while (true){
			async.whilst(
				function testCondition(what) {what(null, keepLooping)},
				function actualLoop(next) {


					
				
					//fetches the json from url
					request(url, function(err, response, body) {
				
						//checks for error in request
						if(err) {
							console.log(err);
							title = '**Error getting Minecraft server Status**';
							desc = '';
							staus = 'error';
						}
				
						//parses the request
						try{
							body = JSON.parse(body);
							if (body.players.online) {
								//people are online and playing
								title = 'Minecraft server is online';
								desc = `**${body.players.online}/${body.players.max}**`;
								onlinePlayers = body.players.list.join('\n');
								status = 'players';
							} else if (body.players.max === null) {
								//parse worked, but players is empty
								title = 'Loading...';
								desc = 'Minecraft server is booting up'
								status = 'error';
							} else {
								//nobody is online
								title = 'Minecraft server is online';
								desc = `**0/${body.players.max}**`;
								status = 'empty';
							}
						}
						catch (e) {
							//could not parse
							title = '**Minecraft server is offline**';
							desc = `API may just be down.\nIf you cannot connect, please notify Zeal`;
							status = 'error';
						}
				
						//gets utc time
						var today = new Date();
						today = today.getUTCHours() + ":" + (today.getUTCMinutes()<10?'0':'') + today.getUTCMinutes();
				

						if (maintOrKill === true) {
							//maint
							try {
								const newEmbed = new Discord.MessageEmbed()
									.setTitle(`${maintReason}`)
									.setColor(0x6600CC)
									.setDescription(`${maintDetails}`)
									.setFooter(`Last Updated ${today} UTC`);
								embd.edit(newEmbed).catch(console.log);
								if (maintReason === 'botMaint') {
									keepLooping = false;
								}
								console.log(`Maintenance successfully begun in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`);
							} catch (e) {
								console.log(`Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								if (fails > 10) {
									keepLooping = false;
									console.log(`Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								}
								fails = fails + 1;
								loops = 0;
							}
						} else if (title === '' || title === undefined) {
							//async bs didn't update this yet, skip
							console.log('Skipping update due to undefined');
						} else if (status === 'players'){
							//people are online and playing
							try {
								const newEmbed = new Discord.MessageEmbed()
									.setAuthor(`${args[0]}`)
									.setTitle(title)
									.setColor(0x00FF0F)
									.setDescription(`${desc}\n${onlinePlayers}`)
									.setFooter(`Last Updated ${today} UTC`);
								embd.edit(newEmbed).catch(console.log);
							} catch (e) {
								console.log(`Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								if (fails > 10) {
									keepLooping = false;
									console.log(`Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								}
								fails = fails + 1;
								loops = 0;
							}
							
						} else if (status === 'empty') {
							//nobody is online
							try {
								const newEmbed = new Discord.MessageEmbed()
									.setAuthor(`${args[0]}`)
									.setTitle(title)
									.setColor(0xFF9900)
									.setDescription(`${desc}`)
									.setFooter(`Last Updated ${today} UTC`);
								embd.edit(newEmbed).catch(console.log);
							} catch (e) {
								console.log(`Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								if (fails > 10) {
									keepLooping = false;
									console.log(`Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								}
								fails = fails + 1;
								loops = 0;
							}
							
						} else if (status === 'error') {
							//any errors
							try {
								const newEmbed = new Discord.MessageEmbed()
									.setAuthor(`${args[0]}`)
									.setTitle(title)
									.setColor(0xFF0000)
									.setDescription(`${desc}`)
									.setFooter(`Last Updated ${today} UTC`);
								embd.edit(newEmbed).catch(console.log);
							} catch (e) {
								console.log(`Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								if (fails > 10) {
									keepLooping = false;
									console.log(`Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								}
								fails = fails + 1;
								loops = 0;
							}
							
						} 
						//this is within the request
					});

					//resets fails after 10 successful attempts
					loops = loops + 1;
					if (loops > 10) {
						fails = 0;
						loops = 0;
					}
					
					//loops every minute
					setTimeout(next, 60000)
					//this is within the message check, verification, embed, and async while loop
				}
				//don't put anything here, I'm not sure what/when it will execute due to async
			)
			//this is within the message check, verification, and embed
		});
		//this is within the message check, and within verification for what the message is
	}











	//start updating an embed with msg id
	else if (command === beginPostingEdit){


		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(`Syntax: **${prefix}${beginPostingEdit}** <server> <message id> <optional channel>`);
		} 

		//verifies the argument is a valid URL
		if (!validURL(args[0])) {
			return message.channel.send(`Syntax: **${prefix}${beginPostingEdit}** <server> <message id> <optional channel>\n**Please provide a valid server URL**`);
		} 

		//changes post destination if specified
		if (!args[2]) {
			channelToPost = message.channel.id;
		} else {
			const matches = args[2].match(/^<#!?(\d+)>$/);
			channelToPost = matches[1];
		}



		try {
			message.channel.send(`Attempting to update embed in channel ${channelToPost} with id ${args[1]}...`)
			const newEmbed = new Discord.MessageEmbed()
				.setTitle('Loading...')
				.setColor(0xFF0000)
				.setDescription('Loading...')
				.setFooter('');
			message.guild.channels.cache.get(channelToPost).messages.fetch({around: args[1], limit: 1}).then(msg => {
				const fetchedMsg = msg.first();
				fetchedMsg.edit(newEmbed).then(embd => {

					//saves discord embed id
					embdID = embd.id; 
					console.log(`Edited embed posted in channel \'${embd.channel.name}\' on server \'${embd.guild.name}\'`);
					keepLooping = true;
					
					
					//loop until message is deleted
					//while (true){
					async.whilst(
						function testCondition(what) {what(null, keepLooping)},
						function actualLoop(next) {


							//variables needed to parse/update
							var url = 'https://api.mcsrvstat.us/2/' + args[0];
							var {title,desc,status,onlinePlayers} = '';
						
							//fetches the json from url
							request(url, function(err, response, body) {
						
								//checks for error in request
								if(err) {
									console.log(err);
									title = '**Error Getting Minecraft server Status**';
									desc = '';
									staus = 'error';
								}
						
								//parses the request
								try{
									body = JSON.parse(body);
									if (body.players.online) {
										//people are online and playing
										title = 'Minecraft server is online';
										desc = `**${body.players.online}/${body.players.max}**`;
										onlinePlayers = body.players.list.join('\n');
										status = 'players';
									} else if (body.players.max === null) {
										//parse worked, but players is empty
										title = 'Loading...';
										desc = 'Minecraft server is booting up'
										status = 'error';
									} else {
										//nobody is online
										title = 'Minecraft server is online';
										desc = `**0/${body.players.max}**`;
										status = 'empty';
									}
								}
								catch (e) {
									//could not parse
									title = '**Minecraft server is offline**';
									desc = `API may just be down.\nIf you cannot connect, please notify Zeal`;
									status = 'error';
								}
						
								//gets utc time
								var today = new Date();
								today = today.getUTCHours() + ":" + (today.getUTCMinutes()<10?'0':'') + today.getUTCMinutes();
						
		
								if (maintOrKill === true) {
									//maint
									try {
										const newEmbed = new Discord.MessageEmbed()
											.setTitle(`${maintReason}`)
											.setColor(0x6600CC)
											.setDescription(`${maintDetails}`)
											.setFooter(`Last Updated ${today} UTC`);
										embd.edit(newEmbed).catch(console.log);
										if (maintReason === 'botMaint') {
											keepLooping = false;
										}
										console.log(`Maintenance successfully begun in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`);
									} catch (e) {
										console.log(`Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										if (fails > 10) {
											keepLooping = false;
											console.log(`Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										}
										fails = fails + 1;
										loops = 0;
										
									}
								} else if (title === '' || title === undefined) {
									//async bs didn't update this yet, skip
									console.log('Skipping update due to undefined');
								} else if (status === 'players'){
									//people are online and playing
									try {
										const newEmbed = new Discord.MessageEmbed()
											.setAuthor(`${args[0]}`)
											.setTitle(title)
											.setColor(0x00FF0F)
											.setDescription(`${desc}\n${onlinePlayers}`)
											.setFooter(`Last Updated ${today} UTC`);
										embd.edit(newEmbed).catch(console.log);
									} catch (e) {
										console.log(`Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										if (fails > 10) {
											keepLooping = false;
											console.log(`Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										}
										fails = fails + 1;
										loops = 0;
									}
									
								} else if (status === 'empty') {
									//nobody is online
									try {
										const newEmbed = new Discord.MessageEmbed()
											.setAuthor(`${args[0]}`)
											.setTitle(title)
											.setColor(0xFF9900)
											.setDescription(`${desc}`)
											.setFooter(`Last Updated ${today} UTC`);
										embd.edit(newEmbed).catch(console.log);
									} catch (e) {
										console.log(`Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										if (fails > 10) {
											keepLooping = false;
											console.log(`Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										}
										fails = fails + 1;
										loops = 0;
									}
									
								} else if (status === 'error') {
									//any errors
									try {
										const newEmbed = new Discord.MessageEmbed()
											.setAuthor(`${args[0]}`)
											.setTitle(title)
											.setColor(0xFF0000)
											.setDescription(`${desc}`)
											.setFooter(`Last Updated ${today} UTC`);
										embd.edit(newEmbed).catch(console.log);
									} catch (e) {
										console.log(`Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										if (fails > 10) {
											keepLooping = false;
											console.log(`Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										}
										fails = fails + 1;
										loops = 0;
									}
									
								} 
								//this is within the request
							});


							//this is within the message check, verification, embed, and async while loop
							//loops every minute
							setTimeout(next, 60000)
						}
						//don't put anything here, I'm not sure what/when it will execute due to async
					)
				});
			});
			//this is within the try
		}
		catch (e) {
			console.log(e)
			return message.reply('Error Posting, please try again and report to bot owner if issue persists')
		}
		//this is within the message check
	}













	//Start maintenance
	else if (command == beginMaint){

		//checks owner is running command
		if (message.author.id != owner.id) {
			return message.reply('Sorry, only the bot owner can execute this command.\nIf you are running your own instance of waifubot, please add your id to owner.json')
		}

		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(`Syntax: **${prefix}${beginMaint}** <reason: serverMaint/botMaint (owner only)> <optional info>`);
		} 

		//verifies the last argument is a valid reason
		if (args[0] != 'serverMaint' && args[0] != 'botMaint') {
			return message.channel.send(`Syntax: **${prefix}${beginMaint}** <reason: serverMaint/botMaint (owner only)> <optional info>\n**Please provide a valid reason**`);
		} else if (args[0] === 'serverMaint') {
			maintReason = 'Ongoing Minecraft server maintenance'
		} else if (args[0] === 'botMaint') {
			maintReason = 'Ongoing bot maintenance'
		}

		maintOrKill = true;
		maintDetails = args.slice(1).join(' ');
		message.reply('Maintenance has begun.')


	}















	//end maintenance
	else if (command === endMaint){
		//checks owner is running command
		if (message.author.id != owner.id) {
			return message.reply('Sorry, only the bot owner can execute this command.\nIf you are running your own instance of waifubot, please add your id to owner.json')
		} else {
			maintOrKill = false;
			maintDetails = '';
			message.reply('Maintenance has ended.')
		}
	}











	//add permission restrictions for commands
	else if (false){
		
	}















	//command to set the restricted channel
	else if (command === setRestrictedChannel) {
		
		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(`Syntax: **${prefix}${setRestrictedChannel}** <channel or 'clear'>\nRestricts bot to only read commands posted in the provided channel`);
			// message.guild.id > serverID
			// args > channelID
		} 
		
		
		//verifies it is a valid channel id
		const matches = '0';
		if (args[0] === 'clear') {
			matches = '0';
		} else {
			matches = args[0].match(/^<#!?(\d+)>$/);
			if (!matches) {
				return message.channel.send(`Syntax: **${prefix}${setRestrictedChannel}** <channel or 'clear'>\nRestricts bot to only read commands posted in the provided channel\n**Please mention a valid channel**`);
			} else {
			}
		}
		

		//creates the json element
		var restrictInfoToJson = {'serverID' : message.guild.id , 'channelID' : matches[1]};

		//https://stackoverflow.com/questions/10679580/javascript-search-inside-a-json-object
		//removes the existing user channel if there is one
		var matchFound = false;
		for (var i=0 ; i < users.list.length ; i++) {
			if (users.list[i]['serverID'] == message.guild.id) {
				users.list.splice(i,1,restrictInfoToJson);
				matchFound = true;
			} 
		}
		if (!matchFound) {
			users.list.push(restrictInfoToJson);
		}

		//adds the info to the users list
		//https://stackoverflow.com/questions/36856232/write-add-data-in-json-file-using-node-js
		fs.readFile('users.json', 'utf8', function readFileCallback(err, data){
			if (err){
				console.log(err);
				return message.channel.send('There was an unexpected error. Try again?');
			} else {
				json = JSON.stringify(users); 		//convert users back to json
				//https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback
				fs.writeFile('users.json', json, (err) => {
					if (err) throw err;
					console.log('Users file has been saved');
					return message.reply(`Updated the restricted channel to <#${matches[1]}>\nNew commands will only be accepted there.`)
				}) //write the file
				
			}
		});
		//this is within the restricted channel commands
	}














	//help command
	if (command === helpCommand) {
		const embed = new Discord.MessageEmbed()
		.setTitle('Help')
		.setColor(0x6600CC)
		.setDescription(`List of commands:\n ${prefix}${beginPosting} | Creates the status message\n${prefix}${beginPostingEdit} | Edits existing embed and begins updating it\n${prefix}${setRestrictedChannel} | Sets channel for commands to be accepted in\n ${prefix}${beginMaint} | Bot Owner only - begins maint\n${prefix}${endMaint} | Bot Onwer only - ends maint`);
		message.reply(embed)
	}














	//this is within the message check, but outside any verification for what was said - aka put other commands here
});
//this is base bot


//valid URL checker
//https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
function validURL(str) {
	var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
	  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
	  '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
	  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
	  '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
	  '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
	return !!pattern.test(str);
}

//sleep
function sleep (time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}
