      throw error;
    }
  }

      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });

      body: JSON.stringify(memberData)
    });
  }

      method: 'DELETE'
    });
  }

      }
    });

    if (!response.ok) {
    }

    return response.blob();
  }

export const memberService = new MemberService();
export default memberService;