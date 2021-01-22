//setting up
const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const users = require('./users.json');
const owner = require('./owner.json');
//const logFile = require('./log.json'); //will this crash if the file doesn't exist?
const request = require('request');
const async = require("async");
const fs = require('fs');

//commands
var prefix = '.';
var beginPosting = 'mc';
var beginPostingEdit = 'emc';
var setRestrict = 'setres';
var refreshUsers = 'reus';
var beginMaint = 'mts';
var endMaint = 'mte';
var helpCommand = 'halp';

//global variables
var okReactID = '✅';
var noReactID = '❌';
var maintOrKill = false;
var maintDetails = '';
var maintReason = '';

//login
client.login(auth.token);
client.once('ready', () => {
	console.log(`[${theTime('local')}] Bot Online`);
});

//listen for messages
client.on('message', message => {




	//verifies a command was used by real user
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	//https://stackoverflow.com/questions/10679580/javascript-search-inside-a-json-object
	//checks if the user is in the restricted channel
	for (var i=0 ; i < users.list.length ; i++) {
		if (users.list[i]['serverID'] == message.guild.id) {
			if (users.list[i].hasOwnProperty('readChannelID') && users.list[i]['readChannelID'] != message.channel.id && users.list[i]['readChannelID'] != "") return;;
		}
	}

	//checks if the user is authorized to post
	//overrides the check if user is admin
	if (!message.member.hasPermission("ADMINISTRATOR")) {
		for (var i=0 ; i < users.list.length ; i++) {
			if (users.list[i]['serverID'] == message.guild.id) {
				if (users.list[i].hasOwnProperty('userPerm') && users.list[i]['userPerm'] != "") { 
					if (!message.member.hasPermission(users.list[i]['userPerm'])) { //needs to be nested or hasPermission will throw an error if blank
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
						return;
					}
				} else if (users.list[i].hasOwnProperty('userRole') && users.list[i]['userRole'] != "") {
					if (!message.member.roles.cache.has(users.list[i]['userRole'])) {
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
						return;
					}
				}
			}
		}
	}
	




	
	//trims off the arguments of the message
	const args = message.content.slice(prefix.length).trim().split(' ');
	const command = args.shift().toLowerCase();










	//Command to post the embed & begin updating it
	if (command === beginPosting) {
		
		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(`Syntax: **${prefix}${beginPosting}** <server> <optional channel>`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 

		//verifies the argument is a valid URL
		if (!validURL(args[0])) {
			return message.channel.send(`Syntax: **${prefix}${beginPosting}** <server> <optional channel>\n**Please provide a valid server URL**`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
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


		//add check for if the channel is allowed to be posted in
		/*





		!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

		don't forget to add it to emc





		*/

		//posts
		message.guild.channels.cache.get(channelToPost).send(embed).then(embd=>{

			//reacts to the command to show it was successful
			message.react(okReactID).catch(error => {
				cannotRRLog(message.channel.name,message.guild.name);
			});


			//saves discord embed id
			//not sure if this is necessary but I don't want to risk it changing during all the edits and having to fetch it every single time
			embdID = embd.id; 
			
			console.log(`[${theTime('')}] Embed posted in channel \'${embd.channel.name}\' on server \'${embd.guild.name}\'`);
			

			//variables needed to parse/update
			var url = 'https://api.mcsrvstat.us/2/' + args[0];
			var {title,desc,status,onlinePlayers} = '';
			var fails = 0;
			var apiFails = 0;
			var loops = 0;
			var keepLooping = true;
			var onlyPostMaintOnce = false;
			
			
			//loop until message is deleted
			//while (true){
			async.whilst(
				function testCondition(what) {what(null, keepLooping)},
				function actualLoop(next) {


					
				
					//fetches the json from url
					request(url, function(err, response, body) {

				

						//checks for error in request
						if(err) {
							apiFails = apiFails + 1;
						}
				

						//parses the request
						if (apiFails > 10) {
							console.log(`[${theTime('')}] Api error getting status for ${args[0]}`);
							title = '**Error Getting Minecraft server Status**';
							desc = '';
							staus = 'error';
						} else {
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
								desc = `API may just be down.\nIf you cannot connect, please notify server owner`;
								status = 'error';
							}
						}
						
				
						
				


						if (maintOrKill === true) {
							//maint
							const newEmbed = new Discord.MessageEmbed()
								.setTitle(`${maintReason}`)
								.setColor(0x6600CC)
								.setDescription(`${maintDetails}`)
								.setFooter(`Last Updated ${theTime('UTC')} UTC`);
							embd.edit(newEmbed).catch(error =>{
								fails = fails + 1;
								loops = 0;
								if (error.httpStatus = 404){
									if (fails > 10) {
										keepLooping = false;
										console.log(`[${theTime('')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
									}
								} else if (fails > 10) {
									keepLooping = false;
									console.log(`[${theTime('')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								} else {
									console.log(`[${theTime('')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`)
								}
							});
							if (maintReason === 'botMaint') {
								keepLooping = false;
							}
							if (!onlyPostMaintOnce){
								console.log(`[${theTime('')}] Maintenance successfully begun in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`);
								onlyPostMaintOnce = true;
							}
								


						} else if (title === '' || title === undefined) {
							//async bs didn't update yet, skip
							console.log(`[${theTime('')}] Skipping update due to undefined`);



						} else if (status === 'players'){
							//people are online and playing
							apiFails = 0;
							const newEmbed = new Discord.MessageEmbed()
								.setAuthor(`${args[0]}`)
								.setTitle(title)
								.setColor(0x00FF0F)
								.setDescription(`${desc}\n${onlinePlayers}`)
								.setFooter(`Last Updated ${theTime('UTC')} UTC`);
							embd.edit(newEmbed).catch(error =>{
								fails = fails + 1;
								loops = 0;
								if (error.httpStatus = 404){
									if (fails > 10) {
										keepLooping = false;
										console.log(`[${theTime('')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
									}
								} else if (fails > 10) {
									keepLooping = false;
									console.log(`[${theTime('')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								} else {
									console.log(`[${theTime('')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`)
								}
							});
							


						} else if (status === 'empty') {
							//nobody is online
							apiFails = 0;
							const newEmbed = new Discord.MessageEmbed()
								.setAuthor(`${args[0]}`)
								.setTitle(title)
								.setColor(0xFF9900)
								.setDescription(`${desc}`)
								.setFooter(`Last Updated ${theTime('UTC')} UTC`);
							embd.edit(newEmbed).catch(error =>{
								fails = fails + 1;
								loops = 0;
								if (error.httpStatus = 404){
									if (fails > 10) {
										keepLooping = false;
										console.log(`[${theTime('')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
									}
								} else if (fails > 10) {
									keepLooping = false;
									console.log(`[${theTime('')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								} else {
									console.log(`[${theTime('')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`)
								}
							});
							
						} else if (status === 'error') {
							//any errors
							const newEmbed = new Discord.MessageEmbed()
								.setAuthor(`${args[0]}`)
								.setTitle(title)
								.setColor(0xFF0000)
								.setDescription(`${desc}`)
								.setFooter(`Last Updated ${theTime('UTC')} UTC`);
							embd.edit(newEmbed).catch(error =>{
								fails = fails + 1;
								loops = 0;
								if (error.httpStatus = 404){
									if (fails > 10) {
										keepLooping = false;
										console.log(`[${theTime('')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
									}
								} else if (fails > 10) {
									keepLooping = false;
									console.log(`[${theTime('')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
								} else {
									console.log(`[${theTime('')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`)
								}
							});
							
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
		}).catch(error => {
			//console.log(e);
			return message.reply('Error Posting, please try again and report to bot owner if issue persists').catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		});
		//this is within the message check, and within verification for what the message is
	}











	//start updating an embed with msg id
	else if (command === beginPostingEdit){
		

		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(`Syntax: **${prefix}${beginPostingEdit}** <server> <message id> <optional channel>`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 

		//verifies the argument is a valid URL
		if (!validURL(args[0])) {
			return message.channel.send(`Syntax: **${prefix}${beginPostingEdit}** <server> <message id> <optional channel>\n**Please provide a valid server URL**`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 

		//changes post destination if specified
		if (!args[2]) {
			channelToPost = message.channel.id;
		} else {
			const matches = args[2].match(/^<#!?(\d+)>$/);
			channelToPost = matches[1];
		}



		try {
			const newEmbed = new Discord.MessageEmbed()
				.setTitle('Loading...')
				.setColor(0xFF0000)
				.setDescription('Loading...')
				.setFooter('');
			message.guild.channels.cache.get(channelToPost).messages.fetch({around: args[1], limit: 1}).then(msg => {
				const fetchedMsg = msg.first();
				fetchedMsg.edit(newEmbed).then(embd => {

					//reacts to the command to show it was successful
					message.react(okReactID).catch(error => {
						cannotRRLog(message.channel.name,message.guild.name);
					});

					//saves discord embed id
					embdID = embd.id; 
					console.log(`[${theTime('')}] Edited embed posted in channel \'${embd.channel.name}\' on server \'${embd.guild.name}\'`);
					var keepLooping = true;
					
					//variables needed to parse/update
					var url = 'https://api.mcsrvstat.us/2/' + args[0];
					var {title,desc,status,onlinePlayers} = '';
					var fails = 0;
					var apiFails = 0;
					var loops = 0;
					var keepLooping = true;
					var onlyPostMaintOnce = false;
					
					//loop until message is deleted
					//while (true){
					async.whilst(
						function testCondition(what) {what(null, keepLooping)},
						function actualLoop(next) {


						
							//fetches the json from url
							request(url, function(err, response, body) {
						

								//checks for error in request
								if(err) {
									apiFails = apiFails + 1;
								}
						

								//parses the request
								if (apiFails > 10) {
									console.log(`[${theTime('')}] Api error getting status for ${args[0]}`);
									title = '**Error Getting Minecraft server Status**';
									desc = '';
									staus = 'error';
								} else {
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
								}
						
		

								if (maintOrKill === true) {
									//maint
									const newEmbed = new Discord.MessageEmbed()
										.setTitle(`${maintReason}`)
										.setColor(0x6600CC)
										.setDescription(`${maintDetails}`)
										.setFooter(`Last Updated ${theTime('UTC')} UTC`);
									embd.edit(newEmbed).catch(error =>{
										fails = fails + 1;
										loops = 0;
										if (error.httpStatus = 404){
											if (fails > 10) {
												keepLooping = false;
												console.log(`[${theTime('UTC')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
											}
										} else if (fails > 10) {
											keepLooping = false;
											console.log(`[${theTime('UTC')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										} else {
											console.log(`[${theTime('UTC')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`)
										}
									});
									if (maintReason === 'botMaint') {
										keepLooping = false;
									}
									if (!onlyPostMaintOnce) {
										console.log(`[${theTime('UTC')}] Maintenance successfully begun in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`);
										onlyPostMaintOnce = true;
									}



								} else if (title === '' || title === undefined) {
									//async bs didn't update this yet, skip
									console.log(`[${theTime('')}] Skipping update due to undefined`);



								} else if (status === 'players'){
									//people are online and playing
									const newEmbed = new Discord.MessageEmbed()
										.setAuthor(`${args[0]}`)
										.setTitle(title)
										.setColor(0x00FF0F)
										.setDescription(`${desc}\n${onlinePlayers}`)
										.setFooter(`Last Updated ${theTime('UTC')} UTC`);
									embd.edit(newEmbed).catch(error =>{
										fails = fails + 1;
										loops = 0;
										if (error.httpStatus = 404){
											if (fails > 10) {
												keepLooping = false;
												console.log(`[${theTime('')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
											}
										} else if (fails > 10) {
											keepLooping = false;
											console.log(`[${theTime('')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										} else {
											console.log(`[${theTime('')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`)
										}
									});
									


								} else if (status === 'empty') {
									//nobody is online
									const newEmbed = new Discord.MessageEmbed()
										.setAuthor(`${args[0]}`)
										.setTitle(title)
										.setColor(0xFF9900)
										.setDescription(`${desc}`)
										.setFooter(`Last Updated ${theTime('UTC')} UTC`);
									embd.edit(newEmbed).catch(error =>{
										fails = fails + 1;
										loops = 0;
										if (error.httpStatus = 404){
											if (fails > 10) {
												keepLooping = false;
												console.log(`[${theTime('')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
											}
										} else if (fails > 10) {
											keepLooping = false;
											console.log(`[${theTime('')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										} else {
											console.log(`[${theTime('')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`)
										}
									});
									


								} else if (status === 'error') {
									//any errors
									const newEmbed = new Discord.MessageEmbed()
										.setAuthor(`${args[0]}`)
										.setTitle(title)
										.setColor(0xFF0000)
										.setDescription(`${desc}`)
										.setFooter(`Last Updated ${theTime('UTC')} UTC`);
									embd.edit(newEmbed).catch(error =>{
										fails = fails + 1;
										loops = 0;
										if (error.httpStatus = 404){
											if (fails > 10) {
												keepLooping = false;
												console.log(`[${theTime('')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
											}
										} else if (fails > 10) {
											keepLooping = false;
											console.log(`[${theTime('')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`)
										} else {
											console.log(`[${theTime('')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`)
										}
									});


									
								} 
								//this is within the request
							});


							//this is within the message check, verification, embed, and async while loop
							//loops every minute
							setTimeout(next, 60000)
						}
						//don't put anything here, I'm not sure what/when it will execute due to async
					)
				}).catch(error => {
					message.reply('Error Posting, please verify your arguments are correct, try again, and report to bot owner if issue persists').catch(error => {
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
					});
				});
			});
			//this is within the try
		}
		catch (e) {
			//console.log(e);
			return message.reply('Error Posting, please try again and report to bot owner if issue persists').catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		}
		//this is within the message check
	}













	//Start maintenance
	else if (command == beginMaint){

		//checks owner is running command
		if (message.author.id != owner.id) {
			return message.channel.send('Sorry, only the bot owner can execute this command.\nIf you are running your own instance of waifubot, please add your id to owner.json').catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		}

		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(`Syntax: **${prefix}${beginMaint}** <reason: serverMaint/botMaint (owner only)> <optional info>`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 

		//verifies the last argument is a valid reason
		if (args[0] != 'serverMaint' && args[0] != 'botMaint') {
			return message.channel.send(`Syntax: **${prefix}${beginMaint}** <reason: serverMaint/botMaint (owner only)> <optional info>\n**Please provide a valid reason**`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} else if (args[0] === 'serverMaint') {
			maintReason = 'Ongoing Minecraft server Maintenance';
		} else if (args[0] === 'botMaint') {
			maintReason = 'Ongoing Bot Maintenance';
		}

		maintOrKill = true;
		onlyPostMaintOnce = false;
		maintDetails = args.slice(1).join(' ');
		message.channel.send('Maintenance has begun.').catch(error => {
			message.react(okReactID).catch(error => {
				cannotRRLog(message.channel.name,message.guild.name);
			});
		});
		

	}















	//end maintenance
	else if (command === endMaint){
		//checks owner is running command
		if (message.author.id != owner.id) {
			return message.channel.send('Sorry, only the bot owner can execute this command.\nIf you are running your own instance of waifubot, please add your id to owner.json').catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} else {
			maintOrKill = false;
			maintDetails = '';
			message.channel.send('Maintenance has ended.').catch(error => {
				message.react(okReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		}
	}







/*
	//refresh json
	else if (command === refreshUsers) {
		try {
			users = require('./users.json'); //this needs to be replaced with a fs.read/open or some shit
			message.react(okReactID).catch(error => {
				cannotRRLog(message.channel.name,message.guild.name);
			});
		} catch (e) {
			message.channel.send('An unexpected error occured, please try again and report to bot owner if issue persists.').catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		}
	}

*/













	//add permission restrictions for commands
	else if (false){
		
	}

















	//command to set the restricted channel
	else if (command === setRestrict) {
		

		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(`Syntax: **${prefix}${setRestrict}** <"readchannel"/"sendchannel"/"role"/"perm"> <"add"/"clear"> <Channel ID/Role ID/Perm ID>
**ReadChannel:** Restricts bot to only read commands posted in the provided channel
**SendChannel:** Restricts bot to only send and edit messages in the provided channel
**Role:** Restricts only users with this role to run commands
**Perm:** Restricts only users with this permission to run commands. (Example: MANAGE_EMOJIS)
**Add:** Replaces the existing restriction. (Bot currently only supports one selection of each, sorry!)
**Clear:** Removes chosen restriction.`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 
		

		//verifies valid selections
		if (args[0] != "readchannel" && args[0] != "sendchannel" && args[0] != "role" && args[0] != "perm") {
			return message.channel.send(`Syntax: **${prefix}${setRestrict}** <"readchannel"/"sendchannel"/"role"/"perm"> <"add"/"clear"> <Channel ID/Role ID/Perm ID>
**ReadChannel:** Restricts bot to only read commands posted in the provided channel
**SendChannel:** Restricts bot to only send and edit messages in the provided channel
**Role:** Restricts only users with this role to run commands
**Perm:** Restricts only users with this permission to run commands. (Example: MANAGE_EMOJIS)
**Add:** Replaces the existing restriction. (Bot currently only supports one selection of each, sorry!)
**Clear:** Removes chosen restriction.
**Invalid Selection, please make sure your message matches exactly the options above shown in "quotation marks"**`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		}

		//verifies secondary selections
		if (args[1] != "add" && args[1] != "clear") {
			return message.channel.send(`Syntax: **${prefix}${setRestrict}** <"readchannel"/"sendchannel"/"role"/"perm"> <"add"/"clear"> <Channel ID/Role ID/Perm ID>
**ReadChannel:** Restricts bot to only read commands posted in the provided channel
**SendChannel:** Restricts bot to only send and edit messages in the provided channel
**Role:** Restricts only users with this role to run commands
**Perm:** Restricts only users with this permission to run commands. (Example: MANAGE_EMOJIS)
**Add:** Replaces the existing restriction. (Bot currently only supports one selection of each, sorry!)
**Clear:** Removes chosen restriction.
**Invalid Selection, please make sure your message matches exactly the options above shown in "quotation marks"**`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		}

		

		//verifies valid channel id
		var matches = ["",""];
		if (args[1] === 'clear') {
			matches = '';
		} else if (args[0] === "readchannel" || args[0] === "sendchannel") {
			if (args[1] === "add") {
				matches = args[2].match(/^<#!?(\d+)>$/);
				if (!matches) {
					return message.channel.send(`Syntax: **${prefix}${setRestrict}** <"readchannel"/"sendchannel"/"role"/"perm"> <"add"/"clear"> <Channel ID/Role ID/Perm ID>
**ReadChannel:** Restricts bot to only read commands posted in the provided channel
**SendChannel:** Restricts bot to only send and edit messages in the provided channel
**Role:** Restricts only users with this role to run commands
**Perm:** Restricts only users with this permission to run commands. (Example: MANAGE_EMOJIS)
**Add:** Replaces the existing restriction. (Bot currently only supports one selection of each, sorry!)
**Clear:** Removes chosen restriction.
**Please mention a valid channel**`).catch(error => {
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
					});
				}
			}
		}


		//Add verification for user id and permission
		/*


		!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		*/


		//variables needed for editing users.json
		var {setReadChannelID,setSendChannelID,setUserRole,setUserPerm} = "";
		var restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":"","sendChannelID":"","userRole":"","userPerm":""};
		var matchFound = false;



		//sets readChannel restrction
		if (args[0] === "readchannel") {
			for (var i=0 ; i < users.list.length ; i++) {
				if (users.list[i]['serverID'] == message.guild.id) {

					if (args[1] === "add") {
						setReadChannelID = matches[1];
					} else if (args[1] === "clear") {
						setReadChannelID = "";
					}

					if(users.list[i].hasOwnProperty['sendChannelID']) {setSendChannelID = users.list[i]['sendChannelID'];}
					else {setSendChannelID = ""}
					if(users.list[i].hasOwnProperty['userRole']) {setUserRole = users.list[i]['userRole'];}
					else {setUserRole = ""}
					if(users.list[i].hasOwnProperty['userPerm']) {setUserPerm = users.list[i]['userPerm'];}
					else {setUserPerm = ""}
					restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
					users.list.splice(i,1,restrictInfoToJson);
					matchFound = true;
				} 
			}
			if (!matchFound) {
				if (args[1] === "clear") {
					return message.channel.send(`You do not currently have any restrictions set.\nDid you mean: \`${prefix}${setRestrict} ${args[0]} Add \`?`).catch(error => {
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
					});
				} else if (args[1] === "add") {
					setReadChannelID = matches[1];
					setSendChannelID = "";
					setUserRole = "";
					setUserPerm = "";
					restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
					users.list.push(restrictInfoToJson);
				}
				
			}



		//sets sendChannel restrction
		} else if (args[0] === "sendchannel") {
			for (var i=0 ; i < users.list.length ; i++) {
				if (users.list[i]['serverID'] == message.guild.id) {
					if(users.list[i].hasOwnProperty['readChannelID']) {setReadChannelID = users.list[i]['readChannelID'];}
					else {setReadChannelID = ""}

					if (args[1] === "add") {
						setSendChannelID = matches[1];
					} else if (args[1] === "clear") {
						setSendChannelID = "";
					}
					
					if(users.list[i].hasOwnProperty['userRole']) {setUserRole = users.list[i]['userRole'];}
					else {setUserRole = ""}
					if(users.list[i].hasOwnProperty['userPerm']) {setUserPerm = users.list[i]['userPerm'];}
					else {setUserPerm = ""}
					restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
					users.list.splice(i,1,restrictInfoToJson);
					matchFound = true;
				} 
			}
			if (!matchFound) {
				if (args[1] === "clear") {
					return message.channel.send(`You do not currently have any restrictions set.\nDid you mean: \`${prefix}${setRestrict} ${args[0]} Add \`?`).catch(error => {
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
					});
				} else if (args[1] === "add") {
					setReadChannelID = "";
					setSendChannelID = matches[1];
					setUserRole = "";
					setUserPerm = "";
					restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
					users.list.push(restrictInfoToJson);
				}
			}
		



		//sets Role restrction
		} else if (args[0] === "role") {
			for (var i=0 ; i < users.list.length ; i++) {
				if (users.list[i]['serverID'] == message.guild.id) {
					if(users.list[i].hasOwnProperty['readChannelID']) {setReadChannelID = users.list[i]['readChannelID'];}
					else {setReadChannelID = ""}
					if(users.list[i].hasOwnProperty['sendChannelID']) {setSendChannelID = users.list[i]['sendChannelID'];}
					else {setSendChannelID = ""}

					if (args[1] === "add") {
						setUserRole = args[2];
					} else if (args[1] === "clear") {
						setUserRole = "";
					}
					
					if(users.list[i].hasOwnProperty['userPerm']) {setUserPerm = users.list[i]['userPerm'];}
					else {setUserPerm = ""}
					restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
					users.list.splice(i,1,restrictInfoToJson);
					matchFound = true;
				} 
			}
			if (!matchFound) {
				if (args[1] === "clear") {
					return message.channel.send(`You do not currently have any restrictions set.\nDid you mean: \`${prefix}${setRestrict} ${args[0]} Add \`?`).catch(error => {
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
					});
				} else if (args[1] === "add") {
					setReadChannelID = "";
					setSendChannelID = "";
					setUserRole = args[2];
					setUserPerm = "";
					restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
					users.list.push(restrictInfoToJson);
				}
			}



		//sets permission restriction
		} else if (args[0] === "perm") {
			for (var i=0 ; i < users.list.length ; i++) {
				if (users.list[i]['serverID'] == message.guild.id) {
					if(users.list[i].hasOwnProperty['readChannelID']) {setReadChannelID = users.list[i]['readChannelID'];}
					else {setReadChannelID = ""}
					if(users.list[i].hasOwnProperty['sendChannelID']) {setSendChannelID = users.list[i]['sendChannelID'];}
					else {setSendChannelID = ""}
					if(users.list[i].hasOwnProperty['userRole']) {setUserRole = users.list[i]['userRole'];}
					else {setUserRole = ""}

					if (args[1] === "add") {
						setUserPerm = args[2];
					} else if (args[1] === "clear") {
						setUserPerm = "";
					}
					
					restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
					users.list.splice(i,1,restrictInfoToJson);
					matchFound = true;
				} 
			}
			if (!matchFound) {
				if (args[1] === "clear") {
					return message.channel.send(`You do not currently have any restrictions set.\nDid you mean: \`${prefix}${setRestrict} ${args[0]} Add \`?`).catch(error => {
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
					});
				} else if (args[1] === "add") {
					setReadChannelID = "";
					setSendChannelID = "";
					setUserRole = "";
					setUserPerm = args[2];
					restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
					users.list.push(restrictInfoToJson);
				}
			}
		}



		//adds the info to the users list
		//https://stackoverflow.com/questions/36856232/write-add-data-in-json-file-using-node-js
		fs.readFile('users.json', 'utf8', function readFileCallback(err, data){
			if (err){
				console.log(`[${today}] Error saving users file!`);
				return message.channel.send('There was an unexpected error. Try again?').catch(error => {
					message.react(noReactID).catch(error => {
						cannotRRLog(message.channel.name,message.guild.name);
					});
				});
			} else {
				json = JSON.stringify(users, null, 2); 		//convert users back to json
				//https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback
				fs.writeFile('users.json', json, (err) => {
					if (err) throw err;
					console.log(`[${theTime('')}] Users file has been saved`);

					message.react(okReactID).catch(error => {
						cannotRRLog(message.channel.name,message.guild.name);
					});
				})
				
			}
		});





		//this is within the set restriction commands
	}














	//help command
	if (command === helpCommand) {
		const embed = new Discord.MessageEmbed()
			.setTitle('Help')
			.setColor(0x6600CC)
			.setDescription(`List of commands:
${prefix}${beginPosting} | Creates the status message
${prefix}${beginPostingEdit} | Edits existing embed and begins updating it
${prefix}${setRestrict} | Restricts channels/users/roles/permissions for bot usage
${prefix}${refreshUsers} | Bot Owner only - refreshes users file
${prefix}${beginMaint} | Bot Owner only - begins maint
${prefix}${endMaint} | Bot Onwer only - ends maint`);
		message.reply(embed).catch(error => {
			message.react(noReactID).catch(error => {
				cannotRRLog(message.channel.name,message.guild.name);
			});
		});
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











//print 'Unable to respond'
function cannotRRLog (channel, server) {
	console.log(`[${theTime('local')}] Unable to respond to a command in \'${channel}\' on server \'${server}\'`);
}








//print



















//fetch time
function theTime (timezone) {
	var today = new Date();
	if (timezone === "UTC") {
		today = today.getUTCHours() + ":" + (today.getUTCMinutes()<10?'0':'') + today.getUTCMinutes();
	} else {
		today = today.getHours() + ":" + (today.getMinutes()<10?'0':'') + today.getMinutes();
	}
	return today;
}








//https://attacomsian.com/blog/nodejs-create-empty-file
//might need to open it first?
//try this function out later
//make sure to log the time and delete it from literally everywhere above
//https://stackoverflow.com/questions/12899061/creating-a-file-only-if-it-doesnt-exist-in-node-js
function fileToLog (stuffToLog) {
	fs.writeFile('log.txt', stuffToLog, { flag: 'wx' }, function (err) {
		if (err) throw err;
		today = today.getHours() + ":" + (today.getMinutes()<10?'0':'') + today.getMinutes();
		console.log(`[${today}] Error logged to file`);
	});
}