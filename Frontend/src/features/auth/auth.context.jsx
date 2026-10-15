// // state layer

// import { createContext,useState,useEffect } from "react";
// import {getMe } from "./services/auth.api";

// export const AuthContext = createContext()


// export const AuthProvider = ({ children }) => { 

//     const [user, setUser] = useState(null)
//     const [loading, setLoading] = useState(true)

//     useEffect(() => {

//         const getAndSetUser = async () => {
//             const data = await getMe()
//             setUser(data.user)
//             setLoading(false)
//         }

    


//     return (
//         <AuthContext.Provider value={{user,setUser,loading,setLoading}} >
//             {children}
//         </AuthContext.Provider>
//     );

    
//     }
// )

// }


import { createContext, useState, useEffect } from "react";
import { getMe } from "./services/auth.api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getAndSetUser = async () => {
    try {
        const data = await getMe();
        setUser(data?.user ?? null);
    } catch (error) {
        console.log("User is not logged in or session expired");
        setUser(null);
    } finally {
        setLoading(false);
    }
};

        getAndSetUser();
    }, []);

    return (
        <AuthContext.Provider
            value={{ user, setUser, loading, setLoading }}
        >
            {children}
        </AuthContext.Provider>
    );
};