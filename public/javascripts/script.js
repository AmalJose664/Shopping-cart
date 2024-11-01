
// popup functions and code are listed here


const cartbox = document.querySelector('.cartbox')

const popup = document.querySelector(".popup") //this is olny for style
const closebtn = document.querySelector('.closebtn')
const heading = document.querySelector('.h4tyu');
const messagePlace = document.querySelector('.messagert6')
const btn = document.querySelector('.yu')
const childOfPopup = document.querySelector('.popup-content')
const okbtn = document.querySelector('.okbtn')


//confirm buttons
const confirm = document.querySelector(".confirm") // this is olny for style
const confirmMessage = document.querySelector(".mesaa221")
const confirmOkbtn = document.querySelector(".confirm-okbtn")
const confirmCancelbtn = document.querySelector(".confirm-cancelbtn")

const subtext = document.getElementById('subsc');
const subEmail = document.getElementById('subemail');


//popup btn scripts 
async function openPopup(h,m,c,todo){
    heading.textContent = h
     messagePlace.innerHTML = m
    childOfPopup.style.border = `2.5px solid ${c}`
    popup.classList.toggle('show')
    
    const pro = ()=>{
        return new Promise((resolve) => {
             resolvebtn = resolve
         })
     }
    await pro().then(()=>{
        if (todo) {
            todo()
            
        }
     })
}
okbtn.onclick = function () {
    popup.classList.toggle('show');

    resolvebtn()
    resolvebtn = null;
}
closebtn.onclick = function () {
    popup.classList.toggle('show');

    resolvebtn()
    resolvebtn = null;
}

//confirm btn scripts


async function customConfirm(message){
    return new Promise((resolve)=>{
        confirmMessage.textContent = message;
        confirm.classList.toggle('show')
        
        reslve = resolve
       
    })
}

confirmOkbtn.onclick = function (){
    confirm.classList.toggle('show')
    reslve(true)
    reslve =null
}
confirmCancelbtn.onclick = function () {
    confirm.classList.toggle('show')
    reslve(false)
    reslve = null
}







let times = $("#cart-count").html()
times = parseInt(times)


async function  addToCart(proId) {
    
    times++
    if(times>5){
        //first parameter, heading of popup
        //second, message of popup
        //third ,type of alert - just pass a color for showing that
        //fourth ,things to do just only after the popup 

        await openPopup("Add to Cart Fail", "Cart has reached its maxzimum capacity:(", 'red')
        
        return 
        
    }
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if(response.status==true){
                times.textContext+1
                // count=parseInt(count)+1
                $("#cart-count").html(times)
                cartbox.classList.toggle("anim")
                setTimeout(()=>{
                    cartbox.classList.toggle("anim")
                },1000)
            }else if(response.status==='log'){
                location.href ="/login"
            }
        }
    })
}

function subs(){
    email = subEmail.value
    if(email.includes("@") && email.includes(".com")){
        $.ajax({
            url:"/subscribe",
            method:"post",
            data:   {email:email},
            success:(response)=>{
                if(response.status){
                    subtext.style.color = "blue"
                    subtext.innerText = "Thank You for Subscribing";
                }else{
                    subtext.style.color = "white"
                    subtext.innerText = "You have already susbcribed";
                }
            }
        })

        
    }else{
        subtext.style.color = "red"
        subtext.innerText = "Please enter a Valid Email";
        
    }
    
}







