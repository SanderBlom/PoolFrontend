

async function CheckTableAvailability() {
    let responseJson
  

    const API = `https://10.8.0.2:7132/checktable`
    const agent = new https.Agent({
      rejectUnauthorized: false //This is enabled since we are using a self signed certificate. We should probably setup a letsencrypt sometime.
    })
    console.log('Dette er en test')
    try {
      const respons = await fetch(API, { agent })
      responseJson = await respons.json()
      console.log('Response table status' + responseJson)
    } catch (error) {
      console.log(error)
    }
    
    if (responseJson.length <= 1) {
      console.log(responseJson[0])
      var status = responseJson[0]
      console.log('status' + status)
      return status
    }
  
    else{
      console.log('test')
      return null} 
  }

  CheckTableAvailability()