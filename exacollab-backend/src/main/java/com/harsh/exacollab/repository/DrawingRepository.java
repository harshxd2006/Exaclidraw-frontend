package com.harsh.exacollab.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.harsh.exacollab.entity.Drawing;

public interface DrawingRepository
        extends JpaRepository<Drawing, UUID> {

}