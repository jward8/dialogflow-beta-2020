const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

let username = "";
let password = "";
let token = "";
let success = false;

USE_LOCAL_ENDPOINT = false;
// set this flag to true if you want to use a local endpoint
// set this flag to false if you want to use the online endpoint
ENDPOINT_URL = ""
if (USE_LOCAL_ENDPOINT){
ENDPOINT_URL = "http://127.0.0.1:5000"
} else{
ENDPOINT_URL = "https://mysqlcs639.cs.wisc.edu"
}

async function updateMessages(msg, isUser, date){
  let request = {
    method: 'POST',
    headers: {'Content-Type': 'application/json',
              'x-access-token': token},
    body: JSON.stringify({
      'date': date,
      'isUser': isUser,
      'text': msg
    })
  }

  const msgReturn = await fetch(ENDPOINT_URL + '/application/messages',request)
  const msgResponse = await msgReturn.json()

  console.log(msgResponse)
}

async function deleteOldMsgs(){
  let request = {
    method: 'DELETE',
    headers: {'Content-Type': 'application/json',
              'x-access-token': token}     
  }

  const delReturn = await fetch(ENDPOINT_URL + '/application/messages',request)
  const delResponse = await delReturn.json()

  console.log(delResponse.messages)
}

async function getCategories(){
  let request = {
    method: 'GET',
    headers: {'Content-Type': 'application/json'}
  }

  const serverReturn = await fetch(ENDPOINT_URL + '/categories',request)
  const serverResponse = await serverReturn.json()

  return serverResponse.categories;
}

async function getToken () {
  let request = {
    method: 'GET',
    headers: {'Content-Type': 'application/json',
              'Authorization': 'Basic '+ base64.encode(username + ':' + password)},
    redirect: 'follow'
  }

  const serverReturn = await fetch(ENDPOINT_URL + '/login',request)
  const serverResponse = await serverReturn.json()
  token = serverResponse.token

  return token;
}

async function getTags(category){
  let request = {
    method: 'GET',
    headers: {'Content-Type': 'application/json'}
  }

  const tagReturn = await fetch(ENDPOINT_URL + '/categories/'+category+'/tags',request)
  const tagResponse = await tagReturn.json()

  return tagResponse.tags
}

app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })

  function welcome () {
    if(success){
      updateMessages(agent.query, true, new Date())
    }
    agent.add('Welcome to WiscShop!')
    if(success){
      updateMessages('Welcome to WiscShop!',false, new Date())
    }
    console.log(ENDPOINT_URL)
  }

  async function login () {
    // You need to set this from `username` entity that you declare in DialogFlow
    username = agent.parameters.username
    // You need to set this from password entity that you declare in DialogFlow
    password = agent.parameters.password
    await getToken()
    
    agent.add("Login successful")
    success = true

    await deleteOldMsgs()
  }

  function loginCheck(){
    if(success){
      updateMessages(agent.query, true, new Date())
      let loginResp = "Log in was a success, " + username
      agent.add(loginResp)
      updateMessages(loginResp, false, new Date())
    }else{
      agent.add("Oh no, it seems that log in was unsuccessful! Try again")
    }
  }

  async function categoryCheck(){
    if(success){
      await updateMessages(agent.query,true,new Date())

      let categories = await getCategories()
      let response = 'We have '
      for(var i = 0; i < Object.values(categories).length; i++){
        if(i === Object.values(categories).length - 1){
          response += 'and ' + categories[i] + '.'
          continue
        }
        response += categories[i] + ', '
      }

      agent.add(response)
      await updateMessages(response, false, new Date())
    }else{
      agent.add("First could you login for me?")
    }
  }

  async function categoryTagCheck(){
    if(success){
      await updateMessages(agent.query, true, new Date())
      let category = agent.parameters.category

      let tags = await getTags(category)
      let response = 'Okay, so we have '
      for(var i = 0; i < Object.values(tags).length; i++){
        if(i === Object.values(tags).length - 1 && Object.values(tags).length === 1){
          response += tags[i] + ' ' + category
          continue
        }else if(i === Object.values(tags).length - 1){
          response += 'and ' + tags[i] + ' ' + category
          continue
        }
        response += tags[i] + ' ' + category + ', '
      }

      agent.add(response)
      await updateMessages(response, false, new Date())
    }else{
      agent.add("First could you login for me?")
    }
  }


  let intentMap = new Map()
  intentMap.set('Default Welcome Intent', welcome)
  intentMap.set('LoginCheck', loginCheck)
  intentMap.set('CategoryQuery', categoryCheck)
  intentMap.set('CategoryTagQuery', categoryTagCheck)
  // You will need to declare this `Login` content in DialogFlow to make this work
  intentMap.set('LoginRequest', login) 
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
