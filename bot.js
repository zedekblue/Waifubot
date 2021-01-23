//setting up
const Discord = require('discord.js');
const client = new Discord.Client();
const auth = require('./auth.json');
const users = require('./users.json');
const owner = require('./owner.json');
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
var maintServer = '';
var maintReason = '';
var maintDetails = '';
var maintReady = true; //todo
var loopLength = 6000;

//login
client.login(auth.token);
client.once('ready', () => {
	addToLog(`[${theTime('local')}] Bot Online`,'',true);
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
			return message.channel.send(howDoIUseThisCommand(beginPosting)).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 

		//verifies the argument is a valid URL
		if (!validURL(args[0])) {
			return message.channel.send(`${howDoIUseThisCommand(beginPosting)}\n**Please provide a valid server URL**`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 

		//changes post destination if specified
		if (!args[1]) {
			channelToPost = message.channel.id;
		} else {
			const matches = args[1].match(/^<#!?(\d+)>$/);
			channelToPost = matches[1];
		}

		//creates the embed
		const embed = new Discord.MessageEmbed()
		.setTitle('Loading...')
		.setColor(0xFF0000)
		.setDescription('Loading...');


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
			addToLog(`[${theTime('')}] Embed posted in channel \'${embd.channel.name}\' on server \'${embd.guild.name}\'`,'',true);
			

			//[0] = How many loops have been completed without an error
			//[1] = How many consecutive non-api errors there have been
			//[2] = How many consecutive api errors there have been
			//[3] = If the loop should continue updating
			//[4] = If the mainenance message has been posted at least once
			//[5] = The server address
			var loopInfo = [0,0,0,true,false,`${args[0]}`];
			var keepLooping = true;
			
			
			//loop until message is deleted
			//while (true){
			async.whilst(
			function testCondition(what) {what(null, keepLooping)},
			function actualLoop(next) {

				loopInfo = serverUpdate(loopInfo,embd);
				keepLooping = loopInfo[3];

				//loops every minute
				setTimeout(next, loopLength)
			}, function (err) {
				//This will execute when the loop ends
			});
		}).catch(error => {
			addToLog('.mc Error',error,false);
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
			return message.channel.send(howDoIUseThisCommand(beginPostingEdit)).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 

		//verifies the argument is a valid URL
		if (!validURL(args[0])) {
			return message.channel.send(`${howDoIUseThisCommand(beginPostingEdit)}\n**Please provide a valid server URL**`).catch(error => {
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
					addToLog(`[${theTime('')}] Edited embed posted in channel \'${embd.channel.name}\' on server \'${embd.guild.name}\'`,'',true);

					//[0] = How many loops have been completed without an error
					//[1] = How many consecutive non-api errors there have been
					//[2] = How many consecutive api errors there have been
					//[3] = If the loop should continue updating
					//[4] = If the mainenance message has been posted at least once
					//[5] = The server address
					var loopInfo = [0,0,0,true,false,`${args[0]}`];
					var keepLooping = true;
					
					
					//loop until message is deleted
					//while (true){
					async.whilst(
					function testCondition(what) {what(null, keepLooping)},
					function actualLoop(next) {

						loopInfo = serverUpdate(loopInfo,embd);
						keepLooping = loopInfo[3];

						//loops every minute
						setTimeout(next, loopLength)
					}, function (err) {
						//This will execute when the loop ends
					});
				}).catch(error => {
					addToLog('.emc edit error',error,false);
					message.reply('Error Posting, please verify your arguments are correct, try again, and report to bot owner if issue persists').catch(error => {
						message.react(noReactID).catch(error => {
							cannotRRLog(message.channel.name,message.guild.name);
						});
					});
				});
			});
			//this is within the try to edit post
		}
		catch (e) {
			addToLog('.emc failed to find message',e,false);
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

		//verifies there are arumgents included, posts error if not
		if (!args.length) {
			return message.channel.send(howDoIUseThisCommand(beginMaint)).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 

		//verifies the first argument is a valid reason
		if (args[0] != 'serverMaint' && args[0] != 'botMaint') {
			return message.channel.send(`${howDoIUseThisCommand(beginMaint)}\n**Please provide a valid reason**`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		}

		//checks owner is running command if botMaint is chosen, proceed with normal restrictions for serverMaint
		if (args[0] === 'botMaint') {
			if (message.author.id != owner.id) {
				return message.channel.send('Sorry, only the bot owner can execute this command.\nIf you are running your own instance of waifubot, please add your id to owner.json').catch(error => {
					message.react(noReactID).catch(error => {
						cannotRRLog(message.channel.name,message.guild.name);
					});
				});
			}
		}

		//verifies the second argument is a valid URL if serverMaint
		//also sets maintDetails depending on which was chosen
		if (args[0] === 'serverMaint') {
			if (!validURL(args[1])) {
				return message.channel.send(`${howDoIUseThisCommand(beginMaint)}\n**Please provide a valid server URL**`).catch(error => {
					message.react(noReactID).catch(error => {
						cannotRRLog(message.channel.name,message.guild.name);
					});
				});
			} 
			maintDetails = args.slice(2).join(' ');
			maintServer = args[1];
		} else {maintDetails = args.slice(1).join(' ');}

		maintReason = args[0];
		maintOrKill = true;
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
			//checks if confirm argument exists
			if (args[0] != 'confirm') {
				return message.channel.send(howDoIUseThisCommand(endMaint)).catch( error => {
					message.react(noReactID).catch(error => {
						cannotRRLog(message.channel.name,message.channel.name);
					});
				});
			//end maint if it does
			} else if (args[0] === 'confirm') {
				maintOrKill = false;
				maintDetails = '';
				message.channel.send('Maintenance has ended.').catch(error => {
					message.react(okReactID).catch(error => {
						cannotRRLog(message.channel.name,message.guild.name);
					});
				});
			}
			
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
			return message.channel.send(`${howDoIUseThisCommand(setRestrict)}\n`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		} 
		

		//verifies valid selections
		if (args[0] != "readchannel" && args[0] != "sendchannel" && args[0] != "role" && args[0] != "perm") {
			return message.channel.send(`${howDoIUseThisCommand(setRestrict)}\n**Invalid Selection, please make sure your message matches exactly the options above shown in "quotation marks"**`).catch(error => {
				message.react(noReactID).catch(error => {
					cannotRRLog(message.channel.name,message.guild.name);
				});
			});
		}

		//verifies secondary selections
		if (args[1] != "add" && args[1] != "clear") {
			return message.channel.send(`${howDoIUseThisCommand(setRestrict)}\n**Invalid Selection, please make sure your message matches exactly the options above shown in "quotation marks"**`).catch(error => {
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
					return message.channel.send(`${howDoIUseThisCommand(setRestrict)}\n**Please mention a valid channel**`).catch(error => {
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




		//grabs existing data from users list and uses it to add/clear the new data
		for (var i=0 ; i < users.list.length ; i++) {
			if (users.list[i]['serverID'] == message.guild.id) {

				//if readchannel is chosen, set or clear it, otherwise use existing value, if there is none, make an empty one
				if (args[0] === "readchannel") {
					if (args[1] === "add") {
						setReadChannelID = matches[1];
					} else if (args[1] === "clear") {
						setReadChannelID = "";
					}
				} else {
					if(users.list[i].hasOwnProperty['readChannelID']) {setReadChannelID = users.list[i]['readChannelID'];}
					else {setReadChannelID = ""}
				}

				//if sendchannel is chosen, set or clear it, otherwise use existing value, if there is none, make an empty one
				if (args[0] === "sendchannel") {
					if (args[1] === "add") {
						setSendChannelID = matches[1];
					} else if (args[1] === "clear") {
						setSendChannelID = "";
					}
				} else {
					if(users.list[i].hasOwnProperty['sendChannelID']) {setSendChannelID = users.list[i]['sendChannelID'];}
					else {setSendChannelID = ""}
				}
				
				//if role is chosen, set or clear it, otherwise use existing value, if there is none, make an empty one
				if (args[0] === "role") {
					if (args[1] === "add") {
						setUserRole = args[2];
					} else if (args[1] === "clear") {
						setUserRole = "";
					}
				} else {
					if(users.list[i].hasOwnProperty['userRole']) {setUserRole = users.list[i]['userRole'];}
					else {setUserRole = ""}
				}
				
				//if perm is chosen, set or clear it, otherwise use existing value, if there is none, make an empty one
				if (args[0] === "perm") {
					if (args[1] === "add") {
						setUserPerm = args[2];
					} else if (args[1] === "clear") {
						setUserPerm = "";
					}
				} else {
					if(users.list[i].hasOwnProperty['userPerm']) {setUserPerm = users.list[i]['userPerm'];}
					else {setUserPerm = ""}
				}

				
				//adds all the previously compiled values to a json value
				restrictInfoToJson = {"serverID": message.guild.id ,"readChannelID":setReadChannelID,"sendChannelID":setSendChannelID,"userRole":setUserRole,"userPerm":setUserPerm};
				users.list.splice(i,1,restrictInfoToJson);
				matchFound = true;
			} 
		}
		//if they are trying to clear the value, return an error if none were found, otherwise create an empty json with the new value
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



		//adds the info to the users list
		//https://stackoverflow.com/questions/36856232/write-add-data-in-json-file-using-node-js
		fs.readFile('users.json', 'utf8', function readFileCallback(err, data){
			if (err){
				addToLog(`[${today}] Error saving users file!`,err,true);
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
					addToLog(`[${theTime('')}] Users file has been saved`,'',true);

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




























































//gives print values for command usage
function howDoIUseThisCommand (whichCommand) {
	if (whichCommand === setRestrict) {
		return `Syntax: **${prefix}${setRestrict}** <"readchannel"/"sendchannel"/"role"/"perm"> <"add"/"clear"> <Channel ID/Role ID/Perm ID>
**ReadChannel:** Restricts bot to only read commands posted in the provided channel
**SendChannel:** Restricts bot to only send and edit messages in the provided channel
**Role:** Restricts only users with this role to run commands
**Perm:** Restricts only users with this permission to run commands (Example: MANAGE_EMOJIS)
**Add:** Replaces the existing restriction (Bot currently only supports one selection of each, sorry!)
**Clear:** Removes chosen restriction
You can right click on a channel or role in developer mode to get the numerical ID needed at the end`;
	} else if (whichCommand === beginMaint) {
		return `Syntax: **${prefix}${beginMaint}** <reason: serverMaint/botMaint (owner only)> <server URL if serverMaint> <optional info>
Changes all bot messages globally to show as under maintenance`;
	} else if (whichCommand === endMaint) {
		return `Syntax: **${prefix}${endMaint}** <confirm>`;
	} else if (whichCommand === beginPosting) {
		return `Syntax: **${prefix}${beginPosting}** <server> <optional channel>
The main function of this bot: Posts an updating embed showing the status of a minecraft server`;
	} else if (whichCommand === beginPostingEdit) {
		return `Syntax: **${prefix}${beginPostingEdit}** <server> <message id> <optional channel>
Edits an existing waifubot message and replaces it with the updating server embed`;
	} else if (whichCommand === refreshUsers) {
		//todo
	}
}



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
	addToLog(`[${theTime('local')}] Unable to respond to a command in \'${channel}\' on server \'${server}\'`,'',true);
}



//add to log file
function addToLog (dataToLog,errorToLog,postToConsole) {
	if (postToConsole) {
		console.log(dataToLog);
	}
	return true;

	/*
	//https://attacomsian.com/blog/nodejs-create-empty-file
	//might need to open it first?
	//try this function out later
	//make sure to log the time and delete it from literally everywhere above
	//https://stackoverflow.com/questions/12899061/creating-a-file-only-if-it-doesnt-exist-in-node-js
	fs.writeFile('log.txt', stuffToLog, { flag: 'wx' }, function (err) {
		if (err) throw err;
		today = today.getHours() + ":" + (today.getMinutes()<10?'0':'') + today.getMinutes();
		console.log(`[${today}] Error logged to file`);

	*/
}



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















//updates the embed
function serverUpdate (loopInfo,embd) {
	var {title,color,desc} = '';
	var url = 'https://api.mcsrvstat.us/2/' + loopInfo[5];
	//var loopInfo = [0,0,0,true,false,`${args[0]}`];
	//[0] = How many loops have been completed without an error
	//[1] = How many consecutive non-api errors there have been
	//[2] = How many consecutive api errors there have been
	//[3] = If the loop should continue updating
	//[4] = If the mainenance message has been posted at least once
	//[5] = The server address
					

	//fetches the json from url
	request(url, function(err, response, body) {
					
		//server is offline
		if(err) {
			loopInfo[2]++;
			if (loopInfo[2] > 9) {
				if (loopInfo[2] === 10) {addToLog(`[${theTime('')}] Api error getting status for ${loopInfo[5]}`,'',true);}
				title = '**Minecraft server is offline**';
				color = '0xFF0000';
				desc = `API may just be down.\nIf you cannot connect, please notify server owner`;
			} 
		} else {
			loopInfo[2] = 0;
			try {
				body = JSON.parse(body);
				//people are online and playing
				if (body.players.online) {
					title = 'Minecraft server is online';
					color = '0x00FF0F';
					desc = `**${body.players.online}/${body.players.max}**\n${body.players.list.join('\n')}`;
				//nobody is online
				} else {
					title = 'Minecraft server is online';
					color = '0xFF9900';
					desc = `**0/${body.players.max}**`;
				}
			} catch (e) {
				loopInfo[2]++;
				if (loopInfo[2] > 9) {
					if (loopInfo[2] === 10) {addToLog(`[${theTime('')}] Api error getting status for ${loopInfo[5]}`,'',true);}
					title = '**Minecraft server is offline**';
					color = '0xFF0000';
					desc = `API may just be down.\nIf you cannot connect, please notify server owner`;
				} 
			}
		}
		if (title === '' || title === undefined) {
			//async bs didn't update yet, skip
			title = 'Loading...';
			color = '0xFF0000';
			desc = 'Loading...';
		}

		//if maint, overwrite all that parsing you just did
		if (maintOrKill) {
			if (maintReason === 'serverMaint') {
				//only updates if this is the server in question
				if (maintServer === loopInfo[5]) {
					title = 'Ongoing Minecraft server maintenance...';
					color = '0x6600CC';
					desc = maintDetails;
					if (!loopInfo[4]) {
						addToLog(`[${theTime('')}] Maintenance successfully begun in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`,'',true);
						loopInfo[4] = true;
					}
				}
			} else {
				title = 'Ongoing bot maintenance...';
				color = '0x6600CC';
				desc = maintDetails;
				loopInfo[3] = false;
				addToLog(`[${theTime('')}] Maintenance successfully begun in \'${embd.channel.name}\' on server \'${embd.guild.name}\'`,'',true);
			}
		} else {
			//reset maint message if no active maint
			loopInfo[4] = false; 
		} 

		//time to update the embed
		const newEmbed = new Discord.MessageEmbed()
			.setAuthor(`${loopInfo[5]}`)
			.setTitle(title)
			.setColor(color)
			.setDescription(desc)
			.setFooter(`Last Updated ${theTime('UTC')} UTC`);
		embd.edit(newEmbed).catch(error =>{
			//adds to error count, resets success count
			loopInfo[2]++;
			loopInfo[0] = 0;
			//stops updating when at 10 consecutive failures to edit, if its not a 404 error, log every time.
			if (loopInfo[2] > 9) {
				loopInfo[3] = false;
				if (error.httpStatus = 404) {addToLog(`[${theTime('')}] Message Deleted, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`,'',true);}
				else {addToLog(`[${theTime('')}] Too many errors, stopping updates for \'${embd.channel.name}\' on server \'${embd.guild.name}\'`,error,true);}
			} else if (error.httpStatus != 404) {
				addToLog(`[${theTime('')}] Error editing embed in \'${embd.channel.name}\' on server \'${embd.guild.name}\' (${fails} times)`,error,true);
			}
		});

		//if you've had 10 successful loops, reset fail count
		loopInfo[0]++;
		if (loopInfo[0] > 10) {
			loopInfo[2] = 0;
		}
	});
	return loopInfo;
}