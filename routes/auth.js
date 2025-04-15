import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 初始化 Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 普通登录（邮箱+密码）
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 使用Supabase的认证系统进行登录
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      throw authError;
    }

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      throw userError;
    }

    res.json({
      user,
      session: authData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Login failed' });
  }
});

// 注册新用户
router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body;

    // 先在Supabase Auth中创建用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      throw authError;
    }

    // 在users表中创建用户记录
    const newUser = {
      
      uid: authData.user.id, // 使用auth用户的ID
      display_name: display_name || email.split('@')[0], // 如果没有提供display_name，使用邮箱前缀
      email: email,
      providers: 'Email',
      provider_type: 'Email',
    };

    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .insert([newUser])
      .single();

    if (createError) {
      throw createError;
    }

    res.json({
      user: createdUser,
      session: authData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Google登录
router.post('/auth/google', async (req, res) => {
  try {
    const { email, display_name } = req.body;
    
    // 检查用户是否已存在
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // 用户不存在，创建新用户
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: uuidv4(), // 为Google登录用户生成随机密码
      });

      if (authError) {
        throw authError;
      }

      const newUser = {
        uid: authData.user.id,
        display_name: display_name || email.split('@')[0],
        email: email,
        providers: 'Google',
        provider_type: 'Social',
      };

      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([newUser])
        .single();
        
      if (createError) {
        throw createError;
      }
      
      user = createdUser;
    } else if (error) {
      throw error;
    }
    
    // 生成会话token
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password: user.uid, // 使用uid作为密码（因为Google登录用户的密码就是他们的uid）
    });
    
    if (sessionError) {
      throw sessionError;
    }
    
    res.json({
      user,
      session: sessionData
    });
    
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router; 