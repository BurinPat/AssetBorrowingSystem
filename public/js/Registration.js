const formAdd = document.querySelector('#formAdd')
formAdd.onsubmit = async function(e){
 e.preventDefault();
 const full_name = formAdd.full_name.value
 const student_id = formAdd.student_id.value
 const username = formAdd.username.value
 const password = formAdd.password.value


const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        "full_name": full_name,
        "student_id": student_id,
        "username": username,
        "password": password
    })
};
try {
    const response = await fetch('/Registration', options);
    if (response.ok) {
        const result = await response.text();
        showLogin();
        formAdd.reset();
    }
    else{
        throw Error('Internal Server Error');
    }

}
catch (err) {
    console.error(err);
    alert(err.message);
}}