fetch('output.json').then(function (response) {
    return response.json();
}).then(function (obj){
    const Data = obj;

    let canvas = document.getElementById('canvas');
    let context = canvas.getContext('2d');

 
    canvas.style.background= "rgb(202 190 190)";
    
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;

    console.log(obj);

    for (let index = 0; index < Data.length; index++) {
        
        context.font = "15px serif";
        context.fillText(obj[index].text,obj[index].translate3d.tx+400,obj[index].translate3d.ty+390);
       // context.fillText(obj[index].name,obj[index].translate3d.tx+400,obj[index].translate3d.ty+370);
        console.log(obj[index].name);
       context.drawImage(document.getElementById(obj[index].name), obj[index].translate3d.tx+400, obj[index].translate3d.ty+400, 40, 40);

    }

}).catch(function (error) {

    console.log("Something went wrong with retrieving the output.json");
    console.log(error);

});


