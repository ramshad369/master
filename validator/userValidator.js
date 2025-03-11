import Joi from 'joi';
import JoiObjectId from 'joi-objectid';

const JoiObjectIdExtension = JoiObjectId(Joi);

export const userSignupSchema = Joi.object({
    countryCode: Joi.string()
        .pattern(/^\+\d{1,3}$/)
        .required()
        .messages({
            'string.pattern.base': 'Country code must be in the format "+XXX" (e.g., "+971")',
            'any.required': 'Country code is required',
        }),
    phone: Joi.string()
        .pattern(/^\d{7,10}$/)
        .required()
        .messages({
            'string.pattern.base': 'Phone number must contain 7 to 10 digits',
        }),
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
    }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Confirm password is required',
    }),
    firstName: Joi.string().min(2).max(30).required(),
    lastName: Joi.string().min(2).max(30).optional(),
    email: Joi.string().email().optional(),
  // Updated address validation in userSignupSchema and updateProfileSchema
address: Joi.array()
.items(
    Joi.object({
        name: Joi.string().required().messages({
            'any.required': 'Name is required',
        }),
        address1: Joi.string().required().messages({
            'any.required': 'Address line 1 is required',
        }),
        address2: Joi.string().optional(),
        city: Joi.string().required().messages({
            'any.required': 'City is required',
        }),
        state: Joi.string().required().messages({
            'any.required': 'State is required',
        }),
        zipCode: Joi.string().pattern(/^\d{5,10}$/).required().messages({
            'string.pattern.base': 'Zip code must be between 5 to 10 digits',
            'any.required': 'Zip code is required',
        }),
        country: Joi.string().required().messages({
            'any.required': 'Country is required',
        }),
        countryCode: Joi.string().pattern(/^\+\d{1,3}$/).required().messages({
            'string.pattern.base': 'Country code must be in the format "+XXX" (e.g., "+1")',
            'any.required': 'Country code is required',
        }),
        phone: Joi.string().pattern(/^\d{7,10}$/).required().messages({
            'string.pattern.base': 'Phone number must contain 7 to 10 digits',
            'any.required': 'Phone number is required',
        }),
    })
)
.optional(),
});

export const forgotPasswordSchema = Joi.object({
    phone: Joi.string().pattern(/^\d{7,10}$/).required().messages({
        'string.pattern.base': 'Phone number must contain 7 to 10 digits',
    }),
    countryCode: Joi.string().pattern(/^\+\d{1,3}$/).required().messages({
        'string.pattern.base': 'Country code must be in the format "+XXX"',
    }),
    email: Joi.string().email().optional(),
});

export const resetPasswordSchema = Joi.object({
    phone: Joi.string().pattern(/^\d{7,10}$/).required().messages({
        'string.pattern.base': 'Phone number must contain 7 to 10 digits',
    }),
    countryCode: Joi.string().pattern(/^\+\d{1,3}$/).required().messages({
        'string.pattern.base': 'Country code must be in the format "+XXX"',
    }),
    otp: Joi.string().length(6).required().messages({
        'string.length': 'OTP must be exactly 6 digits',
    }),
    newPassword: Joi.string().min(6).required().messages({
        'string.min': 'New password must be at least 6 characters long',
    }),
});

// Login Schema
export const loginSchema = Joi.object({
    phone: Joi.string().pattern(/^[+\d]?[0-9-]*$/).required().messages({
        'string.pattern.base': 'Phone number must contain only valid characters (digits, dashes, or a leading "+")',
    }),
    countryCode: Joi.string()
    .pattern(/^\+\d{1,3}$/)
    .required()
    .messages({
        'string.pattern.base': 'Country code must be in the format "+XXX" (e.g., "+971")',
        'any.required': 'Country code is required',
    }),    
    password: Joi.string().min(6).required().messages({
        'string.min': 'Password must be at least 6 characters long',
        'any.required': 'Password is required',
    }),
});

// Cart Schema
export const cartSchema = Joi.object({
    productId: Joi.string().required().messages({
        'any.required': 'Product ID is required',
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        'number.base': 'Quantity must be a number',
        'number.min': 'Quantity must be at least 1',
        'any.required': 'Quantity is required',
    }),
});

// Update Profile Schema
export const updateProfileSchema = Joi.object({
     userId: JoiObjectIdExtension().optional().messages({
        'string.base': 'User ID must be a valid ObjectId',
     }),// Updated address validation in userSignupSchema and updateProfileSchema
     address: Joi.array()
         .items(
             Joi.object({
                 name: Joi.string().required().messages({
                     'any.required': 'Name is required',
                 }),
                 address1: Joi.string().required().messages({
                     'any.required': 'Address line 1 is required',
                 }),
                 address2: Joi.string().optional(),
                 city: Joi.string().required().messages({
                     'any.required': 'City is required',
                 }),
                 state: Joi.string().required().messages({
                     'any.required': 'State is required',
                 }),
                 zipCode: Joi.string().pattern(/^\d{5,10}$/).required().messages({
                     'string.pattern.base': 'Zip code must be between 5 to 10 digits',
                     'any.required': 'Zip code is required',
                 }),
                 country: Joi.string().required().messages({
                     'any.required': 'Country is required',
                 }),
                 countryCode: Joi.string().pattern(/^\+\d{1,3}$/).required().messages({
                     'string.pattern.base': 'Country code must be in the format "+XXX" (e.g., "+1")',
                     'any.required': 'Country code is required',
                 }),
                 phone: Joi.string().pattern(/^\d{7,10}$/).required().messages({
                     'string.pattern.base': 'Phone number must contain 7 to 10 digits',
                     'any.required': 'Phone number is required',
                 }),
             })
         )
         .optional(),     
    email: Joi.string().email().optional().messages({
        'string.email': 'Invalid email format',
    }),
    firstName: Joi.string().min(2).max(30).optional().messages({
        'string.min': 'First name must be at least 2 characters long',
        'string.max': 'First name cannot exceed 30 characters',
    }),
    lastName: Joi.string().min(2).max(30).optional().messages({
        'string.min': 'Last name must be at least 2 characters long',
        'string.max': 'Last name cannot exceed 30 characters',
    }),
});