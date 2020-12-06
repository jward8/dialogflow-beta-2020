const express = require('express')
const { WebhookClient } = require('dialogflow-fulfillment')
const app = express()
const fetch = require('node-fetch')
const base64 = require('base-64')

let username = "";
let password = "";
let token = "";
let products = [];
let tees = [];
let bottoms = [];
let hats = [];
let sweatshirts = [];
let plushes = [];
let leggings =[];
let prodID = [];
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

  console.log(msgResponse.message)
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

async function navigateToPage(page){
  let extension = ''
  if(page === 'homepage' || page === 'home page'){
    extension = '/'
  }else if(page === 'cart' || page === 'checkout'){
    extension = '/' + username + '/cart'
  }else if(page === 'tees' || page === 't-shirts'){
    extension = '/' + username + '/tees'
  }else if(page === 'signup' || page === 'sign-up'){
    extension = '/signUp'
  }else if(page === 'signin' || page === 'sign-in'){
    extension = '/signIn'
  }else if(page === 'welcome'){
    extension = '/' + username
  }else{
    let index = products.indexOf(page)
    let category = ''
    if(hats.includes(page)){
      category = 'hats'
    }else if(plushes.includes(page)){
      category = 'plushes'
    }else if(bottoms.includes(page)){
      category = 'bottoms'
    }else if(tees.includes(page)){
      category = 'tees'
    }else if(leggings.includes(page)){
      category = 'leggings'
    }else if(sweatshirts.includes(page)){
      category = 'sweatshirts'
    }
    extension = '/' + username + '/' + category + '/products/' + prodID[index]
  }

  let request = {
    method: 'PUT',
    headers: {'Content-Type': 'application/json',
    'x-access-token': token},
    body: JSON.stringify({
      'page': extension
    })
  }

  const navReturn = await fetch(ENDPOINT_URL + '/application', request)
  const navResponse = await navReturn.json()

  return "Alright! Here is the page you were looking for";
}

async function getCart(){
  let request = {
    method: 'GET',
    headers: {'Content-Type': 'application/json',
    'x-access-token': token}
  }

  const cartReturn = await fetch(ENDPOINT_URL + '/application/products', request)
  const cartResponse = await cartReturn.json()

  return cartResponse.products;
}

async function getProds(){
  let request = {
    method: 'GET',
    headers: {'Content-Type': 'application/json'}
  }

  const prodReturn = await fetch(ENDPOINT_URL + '/products', request)
  const prodResponse = await prodReturn.json()

  prodResponse.products.forEach(item => {
    products.push(item.name)
    prodID.push(item.id)
    if(item.category === 'bottoms'){
      bottoms.push(item.name)
    }else if(item.category === 'hats'){
      hats.push(item.name)
    }else if(item.category === 'leggings'){
      leggings.push(item.name)
    }else if(item.category === 'tees'){
      tees.push(item.name)
    }else if(item.category === 'sweatshirts'){
      sweatshirts.push(item.name)
    }else if(item.category === 'plushes'){
      plushes.push(item.name)
    }
  })
}

async function getProdInfo(product){
  let request = {
    method: 'GET',
    headers: {'Content-Type': 'application/json'}
  }

  let index = products.indexOf(product);

  const infoReturn = await fetch(ENDPOINT_URL + '/products/' + prodID[index], request)
  const infoResponse = await infoReturn.json()

  return infoResponse
}

async function getProdReview(product){
  let request = {
    method: 'GET',
    headers: {'Content-Type': 'application/json'}
  }

  let index = products.indexOf(product);

  const reviewReturn = await fetch(ENDPOINT_URL + '/products/' + prodID[index] + '/reviews', request)
  const reviewResponse = await reviewReturn.json()

  return reviewResponse.reviews
}

app.get('/', (req, res) => res.send('online'))
app.post('/', express.json(), (req, res) => {
  const agent = new WebhookClient({ request: req, response: res })

  async function welcome () {
    if(success){
      await updateMessages(agent.query, true, new Date())
    }
    agent.add('Welcome to WiscShop!')
    if(success){
      await updateMessages('Welcome to WiscShop!',false, new Date())
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
    await getProds()
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

  async function navigate(){
    if(success){
      await updateMessages(agent.query, true, new Date()) 
      let page;
      if(agent.parameters.storePage !== ''){
        page = agent.parameters.storePage
      }else if(agent.parameters.Product !== ''){
        page = agent.parameters.Product
      }

      let response = await navigateToPage(page)

      agent.add(response)
      await updateMessages(response, false, new Date())
    }else{
      agent.add("I'd be happy to do that for you, first you need to log-in")
    }
  }

  async function cartInfo(){
    if(success){
      await updateMessages(agent.query, true, new Date())
      let cartQuery = agent.parameters.cartInfo
      let itemType = null
      let response = ''
      if(agent.parameters.itemType != ''){
        itemType = agent.parameters.itemType
      }

      let cart = await getCart()

      if(cartQuery === 'much' || cartQuery ==='price' || cartQuery === 'amount'){
        let price = 0
        if(itemType != null){
          cart.forEach(item => {
            if(item.category === itemType){
              price += (item.price * item.count)
            }
          });
          response = 'The price of the ' + itemType + ' in your cart is $' + price
        }else{
          cart.forEach(item => {
            price += (item.price * item.count)
          });
          response = 'The price of your cart is $' + price
        }
      }else if(cartQuery === 'many'){
        let quantity = 0
        if(itemType != null){
          cart.forEach(item => {
            if(item.category === itemType){
              quantity += item.count
            }
          });
          response = 'You have ' + quantity + ' ' + itemType + ' in your cart currently'
        }else{
          response = 'You have '
          for(var i = 0; i < Object.values(cart).length; i++){
            let item = cart[i]
            if(i === Object.values(cart).length - 1 && Object.values(cart).length === 1){
              response += item.count + ' ' + item.name + 's in your cart'
            }else if(i === Object.values(cart).length - 1){
              response += 'and ' + item.count + ' ' + item.name + 's in your cart'
            }else{
              response += item.count + ' ' + item.name + 's, '
            }
          }
        }
      }

      agent.add(response)
      await updateMessages(response, false, new Date())
    }else{
      agent.add('Please sign-in first!')
    }
  }

  async function productQuery(){
    if(success){
      await updateMessages(agent.query,true,new Date())
      let product = agent.parameters.Product
      let query = agent.parameters.InfoQuery
      let response = ''
      console.log(query)
      console.log(query === 'review')
      if(query === 'review'){
        let reviews = await getProdReview(product)
        response = 'Here are the reviews of the ' + product + '\n'
        reviews.forEach(review => {
          response += review.stars + ' stars: ' + review.title + '\n' + review.text + '\n\n'
        });
      }else{
        let prodInfo = await getProdInfo(product)
        if(query === 'price' || query === 'much'){
          response = 'The ' + product + ' costs $' + prodInfo.price
        }else if(query === 'description'){
          response = 'Here you go:\n' + prodInfo.description 
        }
      }

      agent.add(response)
      await updateMessages(response, false, new Date())
    }
  }


  let intentMap = new Map()
  intentMap.set('Default Welcome Intent', welcome)
  intentMap.set('LoginCheck', loginCheck)
  intentMap.set('CategoryQuery', categoryCheck)
  intentMap.set('CategoryTagQuery', categoryTagCheck)
  intentMap.set('StoreNavigation', navigate)
  intentMap.set('CartInformation', cartInfo)
  intentMap.set('ProductInfo', productQuery)
  // You will need to declare this `Login` content in DialogFlow to make this work
  intentMap.set('LoginRequest', login) 
  agent.handleRequest(intentMap)
})

app.listen(process.env.PORT || 8080)
